import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictCode } from '@common/database/constants/database.constant';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { EnumWorkspaceJoinRequestStatus } from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceJoinRequestAlreadyMemberException } from '@modules/workspace/exceptions/workspace.join-request-already-member.exception';
import { WorkspaceJoinRequestAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.join-request-already-processed.exception';
import { WorkspaceJoinRequestNotFoundException } from '@modules/workspace/exceptions/workspace.join-request-not-found.exception';
import type { IWorkspaceJoinRequestWithEmail } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceAcceptJoinRequestUseCase } from '@modules/workspace/use-cases/workspace.accept-join-request.use-case';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import { buildPrismaKnownRequestError } from '@test/unit/helpers/test.unit.database.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
    buildWorkspace,
    buildWorkspaceContext,
    buildWorkspaceMember,
} from '@test/unit/helpers/test.unit.request.helper';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';

describe('WorkspaceAcceptJoinRequestUseCase', () => {
    const workspaceJoinRequestService: MockProxy<WorkspaceJoinRequestService> =
        mock<WorkspaceJoinRequestService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const tx = {} as IDatabaseTransactionClient;
    const workspace: Workspace = buildWorkspace();
    const joinRequest: IWorkspaceJoinRequestWithEmail = {
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
        user: { email: 'user-2@example.com' },
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('reviewer-1', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const workspaceContext = buildWorkspaceContext(
        workspace,
        buildWorkspaceMember('reviewer-1')
    );

    let useCase: WorkspaceAcceptJoinRequestUseCase;

    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(fn => fn(tx));
        workspaceJoinRequestService.getPendingById.mockResolvedValue(
            joinRequest
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceAcceptJoinRequestUseCase,
                {
                    provide: WorkspaceJoinRequestService,
                    useValue: workspaceJoinRequestService,
                },
                { provide: DatabaseService, useValue: databaseService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();

        useCase = module.get(WorkspaceAcceptJoinRequestUseCase);
    });

    describe('execute', () => {
        it('reads the pending request and gates together, then accepts it in one transaction with the workspace name and the context', async () => {
            const callOrder: string[] = [];
            workspaceJoinRequestService.assertJoinRequestAllowed.mockImplementation(
                async () => {
                    callOrder.push('gate');
                }
            );
            workspaceJoinRequestService.getPendingById.mockImplementation(
                async () => {
                    callOrder.push('pending');

                    return joinRequest;
                }
            );
            workspaceJoinRequestService.acceptJoinRequestInTx.mockImplementation(
                async () => {
                    callOrder.push('accept');
                }
            );

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                'join-request-1'
            );

            expect(result).toEqual({});
            expect(callOrder).toEqual(['pending', 'gate', 'accept']);
            expect(
                workspaceJoinRequestService.getPendingById
            ).toHaveBeenCalledWith('join-request-1', 'workspace-1');
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                workspaceJoinRequestService.acceptJoinRequestInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                joinRequest,
                'Acme'
            );
        });

        it('starts the pending read while the join-request gate is still pending', async () => {
            const gate = buildDeferred<void>();
            workspaceJoinRequestService.assertJoinRequestAllowed.mockReturnValue(
                gate.promise
            );
            workspaceJoinRequestService.acceptJoinRequestInTx.mockResolvedValue(
                undefined
            );

            const pending = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                'join-request-1'
            );
            expect(
                workspaceJoinRequestService.getPendingById
            ).toHaveBeenCalledWith('join-request-1', 'workspace-1');
            expect(databaseService.withTransaction).not.toHaveBeenCalled();

            gate.resolve();

            await expect(pending).resolves.toEqual({});
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
                    workspaceContext,
                    'join-request-1'
                )
            ).rejects.toMatchObject({
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.disabled,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it.each([
            new WorkspaceJoinRequestNotFoundException(),
            new WorkspaceJoinRequestAlreadyProcessedException(),
        ])(
            'throws $constructor.name from the pending read and opens no transaction',
            async refusal => {
                workspaceJoinRequestService.getPendingById.mockRejectedValue(
                    refusal
                );

                await expect(
                    useCase.execute(
                        requestContext,
                        apiKeyContext,
                        authContext,
                        workspaceContext,
                        'join-request-1'
                    )
                ).rejects.toBe(refusal);
                expect(databaseService.withTransaction).not.toHaveBeenCalled();
            }
        );

        it('rethrows an AppBaseException from the accept as is', async () => {
            const failure = new WorkspaceJoinRequestAlreadyProcessedException();
            workspaceJoinRequestService.acceptJoinRequestInTx.mockRejectedValue(
                failure
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    'join-request-1'
                )
            ).rejects.toBe(failure);
        });

        it('maps a unique collision on userId to WorkspaceJoinRequestAlreadyMemberException', async () => {
            workspaceJoinRequestService.acceptJoinRequestInTx.mockRejectedValue(
                buildPrismaKnownRequestError('P2002', 'userId')
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    'join-request-1'
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestAlreadyMemberException,
                module: 'workspace',
                statusCode:
                    EnumWorkspaceStatusCodeError.joinRequestAlreadyMember,
            });
        });

        it('maps a write conflict to WorkspaceJoinRequestAlreadyProcessedException', async () => {
            workspaceJoinRequestService.acceptJoinRequestInTx.mockRejectedValue(
                buildPrismaKnownRequestError(DatabaseWriteConflictCode)
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    'join-request-1'
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestAlreadyProcessedException,
                module: 'workspace',
                statusCode:
                    EnumWorkspaceStatusCodeError.joinRequestAlreadyProcessed,
            });
        });

        it('wraps any other transaction error in AppUnknownException', async () => {
            const cause = new Error('boom');
            workspaceJoinRequestService.acceptJoinRequestInTx.mockRejectedValue(
                cause
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    'join-request-1'
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });
});
