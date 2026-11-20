import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceTransferTargetInactiveException } from '@modules/workspace/exceptions/workspace.transfer-target-inactive.exception';
import type { WorkspaceTransferOwnershipRequestDto } from '@modules/workspace/dtos/request/workspace.transfer-ownership.request.dto';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceTransferOwnershipByAdminUseCase } from '@modules/workspace/use-cases/workspace.transfer-ownership-by-admin.use-case';
import {
    buildRequestContext,
    buildApiKeyContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('WorkspaceTransferOwnershipByAdminUseCase', () => {
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext('admin-1');

    let useCase: WorkspaceTransferOwnershipByAdminUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceTransferOwnershipByAdminUseCase,
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
            ],
        }).compile();

        useCase = module.get(WorkspaceTransferOwnershipByAdminUseCase);
    });

    describe('execute', () => {
        it('transfers the workspace to the target user with the contexts', async () => {
            const body: WorkspaceTransferOwnershipRequestDto = {
                targetUserId: 'user-2',
            };

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                body
            );

            expect(result).toEqual({});
            expect(
                workspaceMemberService.transferOwnershipByAdmin
            ).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                'user-2'
            );
        });

        it('rejects with the transfer failure', async () => {
            workspaceMemberService.transferOwnershipByAdmin.mockRejectedValue(
                new WorkspaceTransferTargetInactiveException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    { targetUserId: 'user-2' }
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceTransferTargetInactiveException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.transferTargetInactive,
            });
        });
    });
});
