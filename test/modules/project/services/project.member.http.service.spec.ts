import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import type {
    IPaginationQuery,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type {
    Prisma,
    Project,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import type { PolicyAbility } from '@modules/policy/interfaces/policy.interface';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import type { ProjectMemberAssignRequestDto } from '@modules/project/dtos/request/project.member-assign.request.dto';
import type { ProjectMemberListRequestDto } from '@modules/project/dtos/request/project.member-list.request.dto';
import type { ProjectMemberUpdateRoleRequestDto } from '@modules/project/dtos/request/project.member-update-role.request.dto';
import type {
    IProjectMember,
    IProjectMemberWithRole,
} from '@modules/project/interfaces/project.interface';
import { ProjectMemberHttpService } from '@modules/project/services/project.member.http.service';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';

describe('ProjectMemberHttpService', () => {
    const projectMemberDomain: MockProxy<ProjectMemberDomain> =
        mock<ProjectMemberDomain>();
    const workspaceMemberDomain: MockProxy<WorkspaceMemberDomain> =
        mock<WorkspaceMemberDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const policyDomain: MockProxy<PolicyDomain> = mock<PolicyDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const ability: MockProxy<PolicyAbility> = mock<PolicyAbility>();
    const project = mock<Project>({
        id: 'project-id',
        workspaceId: 'workspace-id',
    });
    const targetMember = mock<IProjectMemberWithRole>({
        id: 'target-member-id',
    });
    const cursorResult = {
        params: mock<
            IPaginationQueryCursorParams<Prisma.ProjectMemberWhereInput>
        >(),
        storePatch: { perPage: 20 } satisfies Partial<IPaginationQuery>,
    };
    let service: ProjectMemberHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        policyDomain.requireStored.mockReturnValue(ability);
        paginationQueryUtil.cursor.mockReturnValue(cursorResult);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectMemberHttpService,
                { provide: PolicyDomain, useValue: policyDomain },
                { provide: ProjectMemberDomain, useValue: projectMemberDomain },
                {
                    provide: WorkspaceMemberDomain,
                    useValue: workspaceMemberDomain,
                },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        service = module.get(ProjectMemberHttpService);
    });

    describe('getMembersList', () => {
        it('merges the store patch and wraps the domain page', async () => {
            const query = {} satisfies ProjectMemberListRequestDto;
            const page = {
                type: EnumPaginationType.cursor as const,
                count: 0,
                perPage: 20,
                hasNext: false,
                cursor: undefined,
                data: [],
            } satisfies IResponsePaginationReturn<IProjectMember>;
            projectMemberDomain.getMembersList.mockResolvedValue(page);

            const result = await service.getMembersList(project, query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                cursorResult.storePatch
            );
            expect(projectMemberDomain.getMembersList).toHaveBeenCalledWith(
                project,
                cursorResult.params
            );
            expect(result).toEqual(page);
        });
    });

    describe('assignMember', () => {
        const dto: ProjectMemberAssignRequestDto = {
            userId: 'target-user-id',
            roleId: 'role-id',
        };

        it.each([true, false])(
            'passes the update-on-ProjectMember ability result (%s) to the domain with the resolved workspace member',
            async canManage => {
                const workspaceMember = mock<WorkspaceMember>();
                const assigned = mock<IProjectMember>();
                ability.can.mockReturnValue(canManage);
                workspaceMemberDomain.getOneByWorkspaceAndUser.mockResolvedValue(
                    workspaceMember
                );
                projectMemberDomain.assignMember.mockResolvedValue(assigned);

                await expect(
                    service.assignMember(project, 'actor-id', dto)
                ).resolves.toEqual({ data: assigned });
                expect(ability.can).toHaveBeenCalledWith(
                    EnumPolicyAction.update,
                    EnumPolicySubject.ProjectMember
                );
                expect(
                    workspaceMemberDomain.getOneByWorkspaceAndUser
                ).toHaveBeenCalledWith('workspace-id', 'target-user-id');
                expect(projectMemberDomain.assignMember).toHaveBeenCalledWith(
                    project,
                    'actor-id',
                    workspaceMember,
                    'role-id',
                    canManage
                );
            }
        );

        it('throws RequestContextMissingException when no ability is stored and assigns nothing', async () => {
            policyDomain.requireStored.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.assignMember(project, 'actor-id', dto)
            ).rejects.toThrow(RequestContextMissingException);
            expect(projectMemberDomain.assignMember).not.toHaveBeenCalled();
        });
    });

    describe('updateMemberRole', () => {
        const dto: ProjectMemberUpdateRoleRequestDto = { roleId: 'role-id' };

        it.each([true, false])(
            'forwards the authorized target and the manage result (%s) to the domain',
            async canManage => {
                ability.can.mockReturnValue(canManage);

                await service.updateMemberRole(
                    project,
                    'actor-id',
                    targetMember,
                    dto
                );

                expect(ability.can).toHaveBeenCalledWith(
                    EnumPolicyAction.update,
                    EnumPolicySubject.ProjectMember
                );
                expect(
                    projectMemberDomain.updateMemberRole
                ).toHaveBeenCalledWith(
                    project,
                    'actor-id',
                    targetMember,
                    'role-id',
                    canManage
                );
            }
        );

        it('throws RequestContextMissingException when no ability is stored', async () => {
            policyDomain.requireStored.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.updateMemberRole(project, 'actor-id', targetMember, dto)
            ).rejects.toThrow(RequestContextMissingException);
            expect(projectMemberDomain.updateMemberRole).not.toHaveBeenCalled();
        });
    });

    describe('removeMember', () => {
        it.each([true, false])(
            'forwards the authorized target and the manage result (%s) to the domain',
            async canManage => {
                ability.can.mockReturnValue(canManage);

                await service.removeMember(project, 'actor-id', targetMember);

                expect(projectMemberDomain.removeMember).toHaveBeenCalledWith(
                    project,
                    'actor-id',
                    targetMember,
                    canManage
                );
            }
        );

        it('throws RequestContextMissingException when no ability is stored', async () => {
            policyDomain.requireStored.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.removeMember(project, 'actor-id', targetMember)
            ).rejects.toThrow(RequestContextMissingException);
            expect(projectMemberDomain.removeMember).not.toHaveBeenCalled();
        });
    });

    describe('leaveProject', () => {
        it('delegates to the domain', async () => {
            const member = mock<IProjectMemberWithRole>();

            await service.leaveProject(project, member);

            expect(projectMemberDomain.leaveProject).toHaveBeenCalledWith(
                project,
                member
            );
        });
    });

    describe('canManageProjectMembers', () => {
        it.each([true, false])(
            'reports whether the stored ability can update ProjectMember (%s)',
            canManage => {
                ability.can.mockReturnValue(canManage);

                expect(service['canManageProjectMembers']()).toBe(canManage);
                expect(ability.can).toHaveBeenCalledWith(
                    EnumPolicyAction.update,
                    EnumPolicySubject.ProjectMember
                );
            }
        );

        it('throws RequestContextMissingException when no ability is stored', () => {
            policyDomain.requireStored.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            expect(() => service['canManageProjectMembers']()).toThrow(
                RequestContextMissingException
            );
        });
    });
});
