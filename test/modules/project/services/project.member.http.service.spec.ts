import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { subject } from '@casl/ability';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    type Prisma,
    type Project,
    type WorkspaceMember,
} from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { ProjectMemberDefaultAvailableOrderBy } from '@modules/project/constants/project.list.constant';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import type { ProjectMemberListRequestDto } from '@modules/project/dtos/request/project.member-list.request.dto';
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

    describe('getMembersList', () => {
        const query = mock<ProjectMemberListRequestDto>();
        const params = {
            where: undefined,
            limit: 20,
            cursor: undefined,
            cursorField: 'id',
            orderBy: [],
        };
        const storePatch = {
            perPage: 20,
            cursor: undefined,
            orderBy: [],
            availableSearch: [],
            availableOrderBy: ['createdAt'],
            filters: {},
        };
        const accessibleWhere: Prisma.ProjectMemberWhereInput = {
            projectId: 'project-id',
        };

        it('passes the read predicate of ProjectMember to the domain list', async () => {
            const member = mock<IProjectMember>();
            policyAbilityDomain.accessibleWhere.mockReturnValue(
                accessibleWhere
            );
            paginationQueryUtil.cursor.mockReturnValue({
                params,
                storePatch,
            } as never);
            projectMemberDomain.getMembersList.mockResolvedValue({
                type: EnumPaginationType.cursor,
                count: 1,
                perPage: 20,
                hasNext: false,
                cursor: undefined,
                data: [member],
            });

            const result = await service.getMembersList(project, query);

            expect(policyAbilityDomain.accessibleWhere).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                EnumPolicySubject.ProjectMember
            );
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableOrderBy: ProjectMemberDefaultAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                storePatch
            );
            expect(projectMemberDomain.getMembersList).toHaveBeenCalledWith(
                project,
                params,
                accessibleWhere
            );
            expect(result.data).toEqual([member]);
        });

        it('propagates PolicyForbiddenException and skips the domain when the ability has no read rule', async () => {
            policyAbilityDomain.accessibleWhere.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.getMembersList(project, query)
            ).rejects.toThrow(PolicyForbiddenException);
            expect(projectMemberDomain.getMembersList).not.toHaveBeenCalled();
        });
    });

    it('checks the prospective member before assigning it', async () => {
        const body = mock<ProjectMemberAssignRequestDto>({
            userId: 'user-id',
            roleId: 'role-id',
        });
        const member = mock<IProjectMember>();
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
        expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
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
        projectMemberDomain.getOneByIdAndProject.mockResolvedValue(
            targetMember
        );
        await service.updateMemberRole(
            project,
            'actor-id',
            'target-member-id',
            body
        );
        expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
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
        const error = new Error('forbidden');
        projectMemberDomain.getOneByIdAndProject.mockResolvedValue(
            targetMember
        );
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
        projectMemberDomain.getOneByIdAndProject.mockResolvedValue(
            targetMember
        );
        await service.removeMember(project, 'actor-id', 'target-member-id');
        expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
            EnumPolicyAction.delete,
            subject(EnumPolicySubject.ProjectMember, targetMember)
        );
        expect(projectMemberDomain.removeMember).toHaveBeenCalledWith(
            project,
            'actor-id',
            targetMember
        );
    });

    it('delegates leaving the project to the domain', async () => {
        projectMemberDomain.leaveProject.mockResolvedValue(undefined);

        await expect(
            service.leaveProject(project, targetMember)
        ).resolves.toBeUndefined();
        expect(projectMemberDomain.leaveProject).toHaveBeenCalledWith(
            project,
            targetMember
        );
    });
});
