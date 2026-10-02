import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { subject } from '@casl/ability';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    type Project,
    type WorkspaceMember,
} from '@generated/prisma-client/client';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import type { PolicyAbility } from '@modules/policy/interfaces/policy.interface';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import type { ProjectMemberAssignRequestDto } from '@modules/project/dtos/request/project.member-assign.request.dto';
import type { ProjectMemberUpdateRoleRequestDto } from '@modules/project/dtos/request/project.member-update-role.request.dto';
import type {
    IProjectMember,
    IProjectMemberWithRole,
} from '@modules/project/interfaces/project.interface';
import { ProjectMemberHttpService } from '@modules/project/services/project.member.http.service';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';

describe('ProjectMemberHttpService', () => {
    const projectMemberDomain: MockProxy<ProjectMemberDomain> = mock();
    const workspaceMemberDomain: MockProxy<WorkspaceMemberDomain> = mock();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> = mock();
    const requestStoreService: MockProxy<RequestStoreService> = mock();
    const policyAbilityDomain: MockProxy<PolicyAbilityDomain> = mock();
    const project = mock<Project>({
        id: 'project-id',
        workspaceId: 'workspace-id',
    });
    const targetMember = mock<IProjectMemberWithRole>();
    let service: ProjectMemberHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectMemberHttpService,
                { provide: ProjectMemberDomain, useValue: projectMemberDomain },
                {
                    provide: WorkspaceMemberDomain,
                    useValue: workspaceMemberDomain,
                },
                { provide: PaginationQueryUtil, useValue: paginationQueryUtil },
                { provide: RequestStoreService, useValue: requestStoreService },
                { provide: PolicyAbilityDomain, useValue: policyAbilityDomain },
            ],
        }).compile();
        service = module.get(ProjectMemberHttpService);
    });

    it('checks the prospective member before assigning it', async () => {
        const body = mock<ProjectMemberAssignRequestDto>({
            userId: 'user-id',
            roleId: 'role-id',
        });
        const ability = mock<PolicyAbility>();
        const member = mock<IProjectMember>();
        policyAbilityDomain.requireStored.mockReturnValue(ability);
        workspaceMemberDomain.getOneByWorkspaceAndUser.mockResolvedValue(
            mock<WorkspaceMember>({
                userId: body.userId,
                workspaceId: project.workspaceId,
            })
        );
        projectMemberDomain.assignMember.mockResolvedValue(member);

        await expect(
            service.assignMember(project, 'actor-id', body)
        ).resolves.toEqual({ data: member });
        expect(projectMemberDomain.assignMember).toHaveBeenCalledWith(
            project,
            'actor-id',
            expect.objectContaining({ userId: body.userId }),
            body.roleId
        );
        expect(policyAbilityDomain.requireStored).toHaveBeenCalledWith(
            PolicyAbilityStoreKey
        );
        expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
            ability,
            EnumPolicyAction.create,
            expect.objectContaining({
                __caslSubjectType__: EnumPolicySubject.ProjectMember,
                projectId: project.id,
                userId: body.userId,
                roleId: body.roleId,
            })
        );
    });

    it('checks the target member before delegating a role update', async () => {
        const body = mock<ProjectMemberUpdateRoleRequestDto>({
            roleId: 'role-id',
        });
        const ability = mock<PolicyAbility>();
        projectMemberDomain.getOneByIdAndProject.mockResolvedValue(
            targetMember
        );
        policyAbilityDomain.requireStored.mockReturnValue(ability);
        await service.updateMemberRole(
            project,
            'actor-id',
            'target-member-id',
            body
        );
        expect(policyAbilityDomain.requireStored).toHaveBeenCalledWith(
            PolicyAbilityStoreKey
        );
        expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
            ability,
            EnumPolicyAction.update,
            subject(EnumPolicySubject.ProjectMember, targetMember)
        );
        expect(projectMemberDomain.updateMemberRole).toHaveBeenCalledWith(
            project,
            'actor-id',
            targetMember,
            body.roleId
        );
    });

    it('does not mutate when the target member fails the policy check', async () => {
        const body = mock<ProjectMemberUpdateRoleRequestDto>({
            roleId: 'role-id',
        });
        const ability = mock<PolicyAbility>();
        const error = new Error('forbidden');
        projectMemberDomain.getOneByIdAndProject.mockResolvedValue(
            targetMember
        );
        policyAbilityDomain.requireStored.mockReturnValue(ability);
        policyAbilityDomain.assertCan.mockImplementation(() => {
            throw error;
        });

        await expect(
            service.updateMemberRole(
                project,
                'actor-id',
                'target-member-id',
                body
            )
        ).rejects.toThrow(error);
        expect(projectMemberDomain.updateMemberRole).not.toHaveBeenCalled();
    });

    it('checks the target member before delegating a removal', async () => {
        const ability = mock<PolicyAbility>();
        projectMemberDomain.getOneByIdAndProject.mockResolvedValue(
            targetMember
        );
        policyAbilityDomain.requireStored.mockReturnValue(ability);
        await service.removeMember(project, 'actor-id', 'target-member-id');
        expect(policyAbilityDomain.requireStored).toHaveBeenCalledWith(
            PolicyAbilityStoreKey
        );
        expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
            ability,
            EnumPolicyAction.delete,
            subject(EnumPolicySubject.ProjectMember, targetMember)
        );
        expect(projectMemberDomain.removeMember).toHaveBeenCalledWith(
            project,
            'actor-id',
            targetMember
        );
    });
});
