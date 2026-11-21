import { UserUtil } from '@modules/user/utils/user.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { ConfigService } from '@nestjs/config';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictCode } from '@common/database/constants/database.constant';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { buildPrismaKnownRequestError } from '@test/unit/helpers/test.unit.database.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumWorkspaceJoinRequestStatus } from '@generated/prisma-client/client';
import type {
    Workspace,
    WorkspaceJoinRequest,
} from '@generated/prisma-client/client';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import type { WorkspaceJoinRequestCreateRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-create.request.dto';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceJoinRequestDuplicateException } from '@modules/workspace/exceptions/workspace.join-request-duplicate.exception';
import type { IWorkspaceJoinRequestPrepared } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceNotPublicException } from '@modules/workspace/exceptions/workspace.not-public.exception';
import { WorkspaceCreateJoinRequestUseCase } from '@modules/workspace/use-cases/workspace.create-join-request.use-case';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
    buildWorkspace,
} from '@test/unit/helpers/test.unit.request.helper';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';

describe('WorkspaceCreateJoinRequestUseCase', () => {
    const workspaceJoinRequestService: MockProxy<WorkspaceJoinRequestService> =
        mock<WorkspaceJoinRequestService>();
    const workspace: Workspace = buildWorkspace();
    const joinable = { workspace, reviewerIds: ['reviewer-1'] };
    const prepared: IWorkspaceJoinRequestPrepared = {
        nonce: 'nonce-hash',
        expiredAt: new Date('2026-01-09T00:00:00.000Z'),
    };
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const tx = {} as IDatabaseTransactionClient;
    const joinRequest: WorkspaceJoinRequest = {
        id: 'join-request-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-2',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-2',
        workspaceId: 'workspace-1',
        userId: 'user-2',
        status: EnumWorkspaceJoinRequestStatus.pending,
        message: 'Please let me in',
        rejectReasonCode: null,
        reviewedByUserId: null,
        reviewedAt: null,
        expiredAt: new Date('2026-01-09T00:00:00.000Z'),
        nonce: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-2', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);

    let useCase: WorkspaceCreateJoinRequestUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceCreateJoinRequestUseCase,
                {
                    provide: WorkspaceJoinRequestService,
                    useValue: workspaceJoinRequestService,
                },
                { provide: DatabaseService, useValue: databaseService },
                UserUtil,
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        'message.availableLanguages': ['en'],
                    }),
                },
            ],
        }).compile();

        useCase = module.get(WorkspaceCreateJoinRequestUseCase);
    });

    describe('execute', () => {
        const body: WorkspaceJoinRequestCreateRequestDto = {
            workspaceId: 'workspace-1',
            message: 'Please let me in',
        };

        beforeEach(() => {
            workspaceJoinRequestService.getJoinableWorkspace.mockResolvedValue(
                joinable
            );
            databaseService.withTransaction.mockImplementation(fn => fn(tx));
            workspaceJoinRequestService.prepareJoinRequest.mockResolvedValue(
                prepared
            );
            workspaceJoinRequestService.createJoinRequestInTx.mockResolvedValue(
                joinRequest
            );
        });

        it('reads the joinable workspace and gates on the flag together, creates the request with the notice and the context', async () => {
            const callOrder: string[] = [];
            workspaceJoinRequestService.assertJoinRequestAllowed.mockImplementation(
                async () => {
                    callOrder.push('gate');
                }
            );
            workspaceJoinRequestService.getJoinableWorkspace.mockImplementation(
                async () => {
                    callOrder.push('joinable');

                    return joinable;
                }
            );
            workspaceJoinRequestService.createJoinRequestInTx.mockImplementation(
                async () => {
                    callOrder.push('create');

                    return joinRequest;
                }
            );
            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                body
            );

            expect(result).toEqual({ data: joinRequest });
            expect(callOrder.slice(0, 2)).toEqual(['joinable', 'gate']);
            expect(callOrder.at(-1)).toBe('create');
            expect(
                workspaceJoinRequestService.assertJoinRequestAllowed
            ).toHaveBeenCalledTimes(1);
            expect(
                workspaceJoinRequestService.getJoinableWorkspace
            ).toHaveBeenCalledWith('user-2', 'workspace-1');
            expect(
                workspaceJoinRequestService.prepareJoinRequest
            ).toHaveBeenCalledWith(authContext, {
                workspaceId: 'workspace-1',
                message: 'Please let me in',
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                workspaceJoinRequestService.createJoinRequestInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                { workspaceId: 'workspace-1', message: 'Please let me in' },
                prepared,
                {
                    workspaceName: 'Acme',
                    requesterName: 'Jane Doe',
                    reviewerIds: ['reviewer-1'],
                }
            );
        });

        it('passes null for an omitted message', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                { workspaceId: 'workspace-1' }
            );

            expect(
                workspaceJoinRequestService.createJoinRequestInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                { workspaceId: 'workspace-1', message: null },
                prepared,
                expect.objectContaining({ reviewerIds: ['reviewer-1'] })
            );
        });

        it('passes an empty reviewer list when the workspace has no reviewer', async () => {
            workspaceJoinRequestService.getJoinableWorkspace.mockResolvedValue({
                workspace,
                reviewerIds: [],
            });

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                body
            );

            expect(result).toEqual({ data: joinRequest });
            expect(
                workspaceJoinRequestService.createJoinRequestInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                { workspaceId: 'workspace-1', message: 'Please let me in' },
                prepared,
                expect.objectContaining({ reviewerIds: [] })
            );
        });

        it('starts the joinable read and the preparation while the join-request gate is still pending', async () => {
            const gate = buildDeferred<void>();
            workspaceJoinRequestService.assertJoinRequestAllowed.mockReturnValue(
                gate.promise
            );

            const pending = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                body
            );
            expect(
                workspaceJoinRequestService.getJoinableWorkspace
            ).toHaveBeenCalledWith('user-2', 'workspace-1');
            expect(
                workspaceJoinRequestService.prepareJoinRequest
            ).toHaveBeenCalledWith(authContext, {
                workspaceId: 'workspace-1',
                message: 'Please let me in',
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();

            gate.resolve();

            await expect(pending).resolves.toEqual({ data: joinRequest });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('stops when the join-request gate rejects', async () => {
            workspaceJoinRequestService.assertJoinRequestAllowed.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    body
                )
            ).rejects.toMatchObject({
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.disabled,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('reads no target when the workspace is not joinable', async () => {
            workspaceJoinRequestService.getJoinableWorkspace.mockRejectedValue(
                new WorkspaceNotPublicException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    body
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notPublic,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('maps a unique collision on nonce to WorkspaceJoinRequestDuplicateException', async () => {
            workspaceJoinRequestService.createJoinRequestInTx.mockRejectedValue(
                buildPrismaKnownRequestError('P2002', 'nonce')
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    body
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestDuplicateException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.joinRequestDuplicate,
            });
        });

        it('maps a write conflict to WorkspaceJoinRequestDuplicateException', async () => {
            workspaceJoinRequestService.createJoinRequestInTx.mockRejectedValue(
                buildPrismaKnownRequestError(DatabaseWriteConflictCode)
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    body
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestDuplicateException,
                statusCode: EnumWorkspaceStatusCodeError.joinRequestDuplicate,
            });
        });

        it('rethrows an AppBaseException from the write as is', async () => {
            const failure = new WorkspaceNotPublicException();
            workspaceJoinRequestService.createJoinRequestInTx.mockRejectedValue(
                failure
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    body
                )
            ).rejects.toBe(failure);
        });

        it('wraps any other transaction error in AppUnknownException', async () => {
            const cause = new Error('db-down');
            workspaceJoinRequestService.createJoinRequestInTx.mockRejectedValue(
                cause
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    body
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });
});
