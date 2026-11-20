import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import type { WorkspaceMemberUpdateRoleRequestDto } from '@modules/workspace/dtos/request/workspace.member-update-role.request.dto';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceUpdateMemberRoleUseCase } from '@modules/workspace/use-cases/workspace.update-member-role.use-case';
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

describe('WorkspaceUpdateMemberRoleUseCase', () => {
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const member: WorkspaceMember = buildWorkspaceMember('user-1');
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-1', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const workspaceContext = buildWorkspaceContext(buildWorkspace(), member);

    let useCase: WorkspaceUpdateMemberRoleUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceUpdateMemberRoleUseCase,
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
            ],
        }).compile();

        useCase = module.get(WorkspaceUpdateMemberRoleUseCase);
    });

    describe('execute', () => {
        it('updates the role with the context', async () => {
            const body: WorkspaceMemberUpdateRoleRequestDto = {
                role: EnumWorkspaceMemberRole.admin,
            };

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                'member-2',
                body
            );

            expect(result).toEqual({});
            expect(
                workspaceMemberService.updateMemberRole
            ).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                member,
                'member-2',
                EnumWorkspaceMemberRole.admin
            );
        });

        it('rejects with the update failure', async () => {
            workspaceMemberService.updateMemberRole.mockRejectedValue(
                new WorkspaceMemberNotFoundException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    'member-2',
                    {
                        role: EnumWorkspaceMemberRole.admin,
                    }
                )
            ).rejects.toBeInstanceOf(WorkspaceMemberNotFoundException);
        });
    });
});
