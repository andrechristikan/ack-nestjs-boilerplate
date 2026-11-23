import {
    buildPolicyAbility,
    buildPolicyContext,
} from '@test/unit/helpers/test.unit.policy.helper';
import type { IWorkspaceMemberWithRole } from '@modules/workspace/interfaces/workspace.interface';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.enum';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import type { WorkspaceMemberUpdateRoleRequestDto } from '@modules/workspace/dtos/request/workspace.member-update-role.request.dto';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceUpdateMemberRoleUseCase } from '@modules/workspace/use-cases/workspace.update-member-role.use-case';
import {
    buildUser,
    buildWorkspace,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
    buildWorkspaceContext,
    buildWorkspaceMember,
} from '@test/unit/helpers/test.unit.request.helper';
import type { IPolicyWhereInput } from '@modules/policy/interfaces/policy.interface';

describe('WorkspaceUpdateMemberRoleUseCase', () => {
    const policyContext = buildPolicyContext(buildPolicyAbility([]));
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const member: IWorkspaceMemberWithRole = buildWorkspaceMember(
        'user-1',
        EnumRoleWorkspaceKey.owner
    );
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();
    const where: IPolicyWhereInput<'WorkspaceMember'> = {
        workspaceId: 'workspace-1',
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-1', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const workspaceContext = buildWorkspaceContext(buildWorkspace(), member);

    let useCase: WorkspaceUpdateMemberRoleUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityService.scope.mockReturnValue(where);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceUpdateMemberRoleUseCase,
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
            ],
        }).compile();

        useCase = module.get(WorkspaceUpdateMemberRoleUseCase);
    });

    describe('execute', () => {
        it('updates the role with the context', async () => {
            const body: WorkspaceMemberUpdateRoleRequestDto = {
                roleId: 'role-workspace-admin',
            };

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                policyContext,
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
                'role-workspace-admin',
                where
            );
            expect(policyAbilityService.scope).toHaveBeenCalledWith(
                policyContext,
                EnumPolicyAction.update,
                EnumPolicySubject.WorkspaceMember
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
                    policyContext,
                    'member-2',
                    {
                        roleId: 'role-workspace-admin',
                    }
                )
            ).rejects.toBeInstanceOf(WorkspaceMemberNotFoundException);
        });
    });
});
