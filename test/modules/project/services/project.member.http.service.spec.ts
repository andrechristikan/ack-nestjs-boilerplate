import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
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
            ],
        }).compile();
        service = module.get(ProjectMemberHttpService);
    });

    it('assigns a member without resolving policy capability in the service', async () => {
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
    });

    it('delegates role updates with only domain data', async () => {
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
        expect(projectMemberDomain.updateMemberRole).toHaveBeenCalledWith(
            project,
            'actor-id',
            targetMember,
            body.roleId
        );
    });

    it('delegates removals with only domain data', async () => {
        projectMemberDomain.getOneByIdAndProject.mockResolvedValue(
            targetMember
        );
        await service.removeMember(project, 'actor-id', 'target-member-id');
        expect(projectMemberDomain.removeMember).toHaveBeenCalledWith(
            project,
            'actor-id',
            targetMember
        );
    });
});
