import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictCode } from '@common/database/constants/database.constant';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceCapReachedException } from '@modules/workspace/exceptions/workspace.cap-reached.exception';
import { WorkspaceMemberPeerForbiddenException } from '@modules/workspace/exceptions/workspace.member-peer-forbidden.exception';
import { WorkspaceSelfTransferException } from '@modules/workspace/exceptions/workspace.self-transfer.exception';
import type { WorkspaceTransferOwnershipRequestDto } from '@modules/workspace/dtos/request/workspace.transfer-ownership.request.dto';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceTransferOwnershipUseCase } from '@modules/workspace/use-cases/workspace.transfer-ownership.use-case';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { buildPrismaKnownRequestError } from '@test/unit/helpers/test.unit.database.helper';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
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

describe('WorkspaceTransferOwnershipUseCase', () => {
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const tx = {} as IDatabaseTransactionClient;
    const member: WorkspaceMember = buildWorkspaceMember('user-1');
    const targetMember: WorkspaceMember = {
        ...buildWorkspaceMember('user-2'),
        id: 'member-2',
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-1', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const workspaceContext = buildWorkspaceContext(buildWorkspace(), member);
    const body: WorkspaceTransferOwnershipRequestDto = {
        targetUserId: 'user-2',
    };

    let useCase: WorkspaceTransferOwnershipUseCase;

    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(fn => fn(tx));
        workspaceMemberService.getTransferTarget.mockResolvedValue(
            targetMember
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceTransferOwnershipUseCase,
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                { provide: WorkspaceService, useValue: workspaceService },
                { provide: DatabaseService, useValue: databaseService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();

        useCase = module.get(WorkspaceTransferOwnershipUseCase);
    });

    describe('execute', () => {
        it('reads the target and checks the target cap together, then swaps the owner in one transaction', async () => {
            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                body
            );

            expect(result).toEqual({});
            expect(
                workspaceMemberService.getTransferTarget
            ).toHaveBeenCalledWith(authContext, 'workspace-1', 'user-2');
            expect(
                workspaceService.assertOwnedCapAvailable
            ).toHaveBeenCalledWith('user-2');
            expect(
                workspaceMemberService.getTransferTarget
            ).toHaveBeenCalledBefore(workspaceService.assertOwnedCapAvailable);
            expect(
                workspaceService.assertOwnedCapAvailable
            ).toHaveBeenCalledBefore(databaseService.withTransaction);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                workspaceMemberService.transferOwnershipInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                member,
                targetMember
            );
        });

        it('starts the target cap check while the target read is still pending', async () => {
            const target = buildDeferred<WorkspaceMember>();
            workspaceMemberService.getTransferTarget.mockReturnValue(
                target.promise
            );

            const pending = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                body
            );
            expect(
                workspaceService.assertOwnedCapAvailable
            ).toHaveBeenCalledWith('user-2');
            expect(databaseService.withTransaction).not.toHaveBeenCalled();

            target.resolve(targetMember);

            await expect(pending).resolves.toEqual({});
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('throws the target refusal and opens no transaction', async () => {
            workspaceMemberService.getTransferTarget.mockRejectedValue(
                new WorkspaceSelfTransferException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    { targetUserId: 'user-1' }
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceSelfTransferException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.selfTransfer,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws WorkspaceCapReachedException for a target at the cap and opens no transaction', async () => {
            workspaceService.assertOwnedCapAvailable.mockRejectedValue(
                new WorkspaceCapReachedException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    body
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.capReached,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('rethrows an AppBaseException from the swap as is', async () => {
            const typed = new WorkspaceMemberPeerForbiddenException();
            workspaceMemberService.transferOwnershipInTx.mockRejectedValue(
                typed
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    body
                )
            ).rejects.toBe(typed);
        });

        it('maps a write conflict to WorkspaceMemberPeerForbiddenException', async () => {
            workspaceMemberService.transferOwnershipInTx.mockRejectedValue(
                buildPrismaKnownRequestError(DatabaseWriteConflictCode)
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    body
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberPeerForbiddenException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,
            });
        });

        it('wraps any other transaction error in AppUnknownException', async () => {
            const otherError = new Error('boom');
            workspaceMemberService.transferOwnershipInTx.mockRejectedValue(
                otherError
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    body
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: otherError,
            });
        });
    });
});
