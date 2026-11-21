import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumDatabaseStatusCodeError } from '@common/database/enums/database.status-code.enum';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { Workspace } from '@generated/prisma-client/client';
import { WorkspaceCapReachedException } from '@modules/workspace/exceptions/workspace.cap-reached.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import type { WorkspaceCreateRequestDto } from '@modules/workspace/dtos/request/workspace.create.request.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceCreateUseCase } from '@modules/workspace/use-cases/workspace.create.use-case';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
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
} from '@test/unit/helpers/test.unit.request.helper';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';

describe('WorkspaceCreateUseCase', () => {
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const tx = {} as IDatabaseTransactionClient;
    const workspace: Workspace = buildWorkspace();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-1', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const body: WorkspaceCreateRequestDto = {
        name: 'Acme',
        description: 'Our team workspace',
        isPublic: true,
    };

    let useCase: WorkspaceCreateUseCase;
    let databaseUtil: DatabaseUtil;

    beforeEach(async () => {
        workspaceService.drawSlugCandidates.mockReturnValue([
            'ws-aaa',
            'ws-bbb',
        ]);
        databaseService.withTransaction.mockImplementation(fn => fn(tx));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceCreateUseCase,
                { provide: WorkspaceService, useValue: workspaceService },
                { provide: DatabaseService, useValue: databaseService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();

        useCase = module.get(WorkspaceCreateUseCase);
        databaseUtil = module.get(DatabaseUtil);
        vi.spyOn(databaseUtil, 'createId')
            .mockReturnValueOnce('workspace-1')
            .mockReturnValueOnce('workspace-2');
    });

    describe('execute', () => {
        it('throws WorkspaceCapReachedException from the cap check and opens no transaction', async () => {
            workspaceService.assertOwnedCapAvailable.mockRejectedValue(
                new WorkspaceCapReachedException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    body
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.capReached,
            });
            expect(
                workspaceService.assertOwnedCapAvailable
            ).toHaveBeenCalledWith('user-1');
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('creates the workspace on the first slug candidate in one transaction and wraps it in the response envelope', async () => {
            workspaceService.createWorkspaceInTx.mockResolvedValue(workspace);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                body
            );

            expect(result).toEqual({ data: workspace });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                workspaceService.assertOwnedCapAvailable
            ).toHaveBeenCalledBefore(databaseService.withTransaction);
            expect(workspaceService.createWorkspaceInTx).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                'ws-aaa',
                {
                    name: 'Acme',
                    description: 'Our team workspace',
                    isPublic: true,
                }
            );
        });

        it('passes null for an omitted description and visibility', async () => {
            workspaceService.createWorkspaceInTx.mockResolvedValue(workspace);

            await useCase.execute(requestContext, apiKeyContext, authContext, {
                name: 'Acme',
            });

            expect(workspaceService.createWorkspaceInTx).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                'ws-aaa',
                { name: 'Acme', description: null, isPublic: null }
            );
        });

        it('opens a second transaction with the next slug candidate and a new id after a slug collision', async () => {
            workspaceService.createWorkspaceInTx
                .mockRejectedValueOnce(
                    buildPrismaKnownRequestError('P2002', 'slug')
                )
                .mockResolvedValueOnce(workspace);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                body
            );

            expect(result).toEqual({ data: workspace });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
            expect(
                workspaceService.createWorkspaceInTx
            ).toHaveBeenNthCalledWith(
                2,
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-2',
                'ws-bbb',
                {
                    name: 'Acme',
                    description: 'Our team workspace',
                    isPublic: true,
                }
            );
        });

        it('throws DatabaseUniqueValueGenerationFailedException when every slug candidate collides', async () => {
            workspaceService.createWorkspaceInTx.mockRejectedValue(
                buildPrismaKnownRequestError('P2002', 'slug')
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    body
                )
            ).rejects.toMatchObject({
                statusCode:
                    EnumDatabaseStatusCodeError.uniqueValueGenerationFailed,
                constructor: DatabaseUniqueValueGenerationFailedException,
                module: 'database',
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
        });

        it('rethrows an AppBaseException without retrying', async () => {
            const typed = new WorkspaceNotFoundException();
            workspaceService.createWorkspaceInTx.mockRejectedValue(typed);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    body
                )
            ).rejects.toBe(typed);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('wraps a non-collision failure in AppUnknownException without retrying', async () => {
            const otherError = new Error('unexpected');
            workspaceService.createWorkspaceInTx.mockRejectedValue(otherError);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    body
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: otherError,
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });
    });
});
