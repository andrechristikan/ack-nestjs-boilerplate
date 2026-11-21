import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictCode } from '@common/database/constants/database.constant';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceCapReachedException } from '@modules/workspace/exceptions/workspace.cap-reached.exception';
import { WorkspaceMemberPeerForbiddenException } from '@modules/workspace/exceptions/workspace.member-peer-forbidden.exception';
import { WorkspaceTransferTargetInactiveException } from '@modules/workspace/exceptions/workspace.transfer-target-inactive.exception';
import type { IWorkspaceTransfer } from '@modules/workspace/interfaces/workspace.interface';
import type { WorkspaceTransferOwnershipRequestDto } from '@modules/workspace/dtos/request/workspace.transfer-ownership.request.dto';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceTransferOwnershipByAdminUseCase } from '@modules/workspace/use-cases/workspace.transfer-ownership-by-admin.use-case';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { buildPrismaKnownRequestError } from '@test/unit/helpers/test.unit.database.helper';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import {
    buildRequestContext,
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildWorkspaceMember,
} from '@test/unit/helpers/test.unit.request.helper';

describe('WorkspaceTransferOwnershipByAdminUseCase', () => {
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const tx = {} as IDatabaseTransactionClient;
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext('admin-1');
    const transfer: IWorkspaceTransfer = {
        ownerMember: {
            ...buildWorkspaceMember('user-1'),
            role: EnumWorkspaceMemberRole.owner,
        },
        targetMember: {
            ...buildWorkspaceMember('user-2'),
            id: 'member-2',
        },
    };
    const body: WorkspaceTransferOwnershipRequestDto = {
        targetUserId: 'user-2',
    };

    let useCase: WorkspaceTransferOwnershipByAdminUseCase;

    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(fn => fn(tx));
        workspaceMemberService.getTransferByAdmin.mockResolvedValue(transfer);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceTransferOwnershipByAdminUseCase,
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

        useCase = module.get(WorkspaceTransferOwnershipByAdminUseCase);
    });

    describe('execute', () => {
        it('reads the transfer and checks the target cap together, then swaps the owner in one transaction', async () => {
            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                body
            );

            expect(result).toEqual({});
            expect(
                workspaceMemberService.getTransferByAdmin
            ).toHaveBeenCalledWith('workspace-1', 'user-2');
            expect(
                workspaceService.assertOwnedCapAvailable
            ).toHaveBeenCalledWith('user-2');
            expect(
                workspaceService.assertOwnedCapAvailable
            ).toHaveBeenCalledBefore(databaseService.withTransaction);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                workspaceMemberService.transferOwnershipByAdminInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                transfer
            );
        });

        it('starts the target cap check while the transfer read is still pending', async () => {
            const read = buildDeferred<IWorkspaceTransfer>();
            workspaceMemberService.getTransferByAdmin.mockReturnValue(
                read.promise
            );

            const pending = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                body
            );
            expect(
                workspaceService.assertOwnedCapAvailable
            ).toHaveBeenCalledWith('user-2');
            expect(databaseService.withTransaction).not.toHaveBeenCalled();

            read.resolve(transfer);

            await expect(pending).resolves.toEqual({});
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('throws the transfer refusal and opens no transaction', async () => {
            workspaceMemberService.getTransferByAdmin.mockRejectedValue(
                new WorkspaceTransferTargetInactiveException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    body
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceTransferTargetInactiveException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.transferTargetInactive,
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
                    'workspace-1',
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
            workspaceMemberService.transferOwnershipByAdminInTx.mockRejectedValue(
                typed
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    body
                )
            ).rejects.toBe(typed);
        });

        it('maps a write conflict to WorkspaceMemberPeerForbiddenException', async () => {
            workspaceMemberService.transferOwnershipByAdminInTx.mockRejectedValue(
                buildPrismaKnownRequestError(DatabaseWriteConflictCode)
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
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
            workspaceMemberService.transferOwnershipByAdminInTx.mockRejectedValue(
                otherError
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    body
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: otherError,
            });
        });
    });
});
