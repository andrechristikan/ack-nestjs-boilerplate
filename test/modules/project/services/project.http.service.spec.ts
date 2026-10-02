import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import type {
    IPaginationQuery,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
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
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import type {
    IEffectivePermission,
    PolicyAbility,
} from '@modules/policy/interfaces/policy.interface';
import { ProjectPermissionSubjects } from '@modules/project/constants/project.constant';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import type { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import type { ProjectAdminListRequestDto } from '@modules/project/dtos/request/project.admin-list.request.dto';
import type { ProjectUpdateSlugRequestDto } from '@modules/project/dtos/request/project.update-slug.request.dto';
import type { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import type { ProjectUserListRequestDto } from '@modules/project/dtos/request/project.user-list.request.dto';
import type { IProjectMemberWithRole } from '@modules/project/interfaces/project.interface';
import { ProjectHttpService } from '@modules/project/services/project.http.service';

describe('ProjectHttpService', () => {
    const projectDomain: MockProxy<ProjectDomain> = mock<ProjectDomain>();
    const policyDomain: MockProxy<PolicyDomain> = mock<PolicyDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const ability: MockProxy<PolicyAbility> = mock<PolicyAbility>();
    const project = mock<Project>({ id: 'project-id' });
    const workspaceMember = mock<WorkspaceMember>({ userId: 'user-id' });
    const page = {
        type: EnumPaginationType.cursor as const,
        count: 1,
        perPage: 20,
        hasNext: false,
        cursor: undefined,
        data: [project],
    } satisfies IResponsePaginationReturn<Project>;
    const cursorResult = {
        params: mock<IPaginationQueryCursorParams<Prisma.ProjectWhereInput>>(),
        storePatch: { perPage: 20 } satisfies Partial<IPaginationQuery>,
    };
    const offsetResult = {
        params: mock<IPaginationQueryOffsetParams<Prisma.ProjectWhereInput>>(),
        storePatch: {
            page: 1,
            perPage: 20,
        } satisfies Partial<IPaginationQuery>,
    };
    const accessibleWhere: Prisma.ProjectWhereInput = {
        workspaceId: 'workspace-id',
    };
    let service: ProjectHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        policyDomain.requireStored.mockReturnValue(ability);
        paginationQueryUtil.cursor.mockReturnValue(cursorResult);
        paginationQueryUtil.offset.mockReturnValue(offsetResult);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectHttpService,
                { provide: ProjectDomain, useValue: projectDomain },
                { provide: PolicyDomain, useValue: policyDomain },
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

        service = module.get(ProjectHttpService);
    });

    describe('getListForMember', () => {
        const query = {} satisfies ProjectUserListRequestDto;

        it('lists every project and passes the read predicate when the ability can read projects', async () => {
            ability.can.mockReturnValue(true);
            policyDomain.accessibleWhere.mockReturnValue(accessibleWhere);
            projectDomain.getListForMember.mockResolvedValue(page);

            const result = await service.getListForMember(
                'workspace-id',
                workspaceMember,
                query
            );

            expect(ability.can).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                EnumPolicySubject.Project
            );
            expect(policyDomain.accessibleWhere).toHaveBeenCalledWith(
                ability,
                EnumPolicyAction.read,
                EnumPolicySubject.Project
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                cursorResult.storePatch
            );
            expect(projectDomain.getListForMember).toHaveBeenCalledWith(
                'workspace-id',
                workspaceMember,
                cursorResult.params,
                true,
                accessibleWhere
            );
            expect(result).toEqual(page);
        });

        it('limits the list to member projects and passes no where when the ability cannot read projects', async () => {
            ability.can.mockReturnValue(false);
            policyDomain.accessibleWhere.mockReturnValue(null);
            projectDomain.getListForMember.mockResolvedValue(page);

            await service.getListForMember(
                'workspace-id',
                workspaceMember,
                query
            );

            expect(projectDomain.getListForMember).toHaveBeenCalledWith(
                'workspace-id',
                workspaceMember,
                cursorResult.params,
                false,
                undefined
            );
        });

        it('throws RequestContextMissingException when no ability is stored and never lists', async () => {
            policyDomain.requireStored.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.getListForMember('workspace-id', workspaceMember, query)
            ).rejects.toThrow(RequestContextMissingException);
            expect(projectDomain.getListForMember).not.toHaveBeenCalled();
        });
    });

    describe('createProject', () => {
        it('delegates the name and description and wraps the project', async () => {
            const dto: ProjectCreateRequestDto = {
                name: 'Project',
                description: 'About',
            };
            projectDomain.createProject.mockResolvedValue(project);

            await expect(
                service.createProject('workspace-id', 'actor-id', dto)
            ).resolves.toEqual({ data: project });
            expect(projectDomain.createProject).toHaveBeenCalledWith(
                'workspace-id',
                'actor-id',
                { name: 'Project', description: 'About' }
            );
        });
    });

    describe('getProject', () => {
        it('wraps the project the domain returns', () => {
            projectDomain.getProject.mockReturnValue(project);

            expect(service.getProject(project)).toEqual({ data: project });
            expect(projectDomain.getProject).toHaveBeenCalledWith(project);
        });
    });

    describe('updateProject', () => {
        it('delegates the update and wraps the result', async () => {
            const dto: ProjectUpdateRequestDto = {
                name: 'Renamed',
                description: 'New',
            };
            projectDomain.updateProject.mockResolvedValue(project);

            await expect(
                service.updateProject(project, 'actor-id', dto)
            ).resolves.toEqual({ data: project });
            expect(projectDomain.updateProject).toHaveBeenCalledWith(
                project,
                'actor-id',
                { name: 'Renamed', description: 'New' }
            );
        });
    });

    describe('updateProjectSlug', () => {
        it('delegates the slug and wraps the result', async () => {
            const dto: ProjectUpdateSlugRequestDto = { slug: 'new-slug' };
            projectDomain.updateProjectSlug.mockResolvedValue(project);

            await expect(
                service.updateProjectSlug(project, 'actor-id', dto)
            ).resolves.toEqual({ data: project });
            expect(projectDomain.updateProjectSlug).toHaveBeenCalledWith(
                project,
                'actor-id',
                'new-slug'
            );
        });
    });

    describe('softDeleteProject', () => {
        it('delegates the delete', async () => {
            await service.softDeleteProject(project, 'actor-id');

            expect(projectDomain.softDeleteProject).toHaveBeenCalledWith(
                project,
                'actor-id'
            );
        });
    });

    describe('getListForAdmin', () => {
        it('merges the workspace filter, reads the predicate and wraps the page', async () => {
            const query: ProjectAdminListRequestDto = {
                workspaceId: 'workspace-id',
            };
            policyDomain.requireAccessibleWhere.mockReturnValue(
                accessibleWhere
            );
            projectDomain.getListForAdmin.mockResolvedValue(page);

            const result = await service.getListForAdmin(query);

            expect(policyDomain.requireAccessibleWhere).toHaveBeenCalledWith(
                ability,
                EnumPolicyAction.read,
                EnumPolicySubject.Project
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                expect.objectContaining({
                    filters: expect.objectContaining({
                        workspaceId: 'workspace-id',
                    }),
                })
            );
            expect(projectDomain.getListForAdmin).toHaveBeenCalledWith(
                offsetResult.params,
                'workspace-id',
                accessibleWhere
            );
            expect(result).toEqual(page);
        });

        it('lists without a workspace filter when the query carries none', async () => {
            policyDomain.requireAccessibleWhere.mockReturnValue(
                accessibleWhere
            );
            projectDomain.getListForAdmin.mockResolvedValue(page);

            await service.getListForAdmin({});

            expect(projectDomain.getListForAdmin).toHaveBeenCalledWith(
                offsetResult.params,
                undefined,
                accessibleWhere
            );
        });

        it('throws RequestContextMissingException when no ability is stored and never lists', async () => {
            policyDomain.requireStored.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(service.getListForAdmin({})).rejects.toThrow(
                RequestContextMissingException
            );
            expect(projectDomain.getListForAdmin).not.toHaveBeenCalled();
        });

        it('propagates the policy rejection when the ability holds no read rule and never lists', async () => {
            policyDomain.requireAccessibleWhere.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(service.getListForAdmin({})).rejects.toThrow(
                PolicyForbiddenException
            );
            expect(projectDomain.getListForAdmin).not.toHaveBeenCalled();
        });
    });

    describe('getEffectivePermissions', () => {
        it('reads the stored ability and wraps the project permissions', () => {
            const permissions = mock<IEffectivePermission[]>();
            policyDomain.getEffectivePermissions.mockReturnValue(permissions);

            const result = service.getEffectivePermissions(
                project,
                mock<IProjectMemberWithRole>()
            );

            expect(policyDomain.getEffectivePermissions).toHaveBeenCalledWith(
                ability,
                ProjectPermissionSubjects
            );
            expect(result).toEqual({ data: { permissions } });
        });

        it('throws when the ability is absent from the store', () => {
            policyDomain.requireStored.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            expect(() =>
                service.getEffectivePermissions(
                    project,
                    mock<IProjectMemberWithRole>()
                )
            ).toThrow(RequestContextMissingException);
        });
    });
});
