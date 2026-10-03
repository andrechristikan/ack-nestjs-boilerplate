import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { subject } from '@casl/ability';

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
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
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
import { ProjectHttpService } from '@modules/project/services/project.http.service';

describe('ProjectHttpService', () => {
    const projectDomain: MockProxy<ProjectDomain> = mock<ProjectDomain>();
    const policyAbilityDomain: MockProxy<PolicyAbilityDomain> =
        mock<PolicyAbilityDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const ability: MockProxy<PolicyAbility> = mock<PolicyAbility>();
    const project = mock<Project>({
        id: 'project-id',
        workspaceId: 'workspace-id',
    });
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
        policyAbilityDomain.requireStored.mockReturnValue(ability);
        paginationQueryUtil.cursor.mockReturnValue(cursorResult);
        paginationQueryUtil.offset.mockReturnValue(offsetResult);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectHttpService,
                { provide: ProjectDomain, useValue: projectDomain },
                { provide: PolicyAbilityDomain, useValue: policyAbilityDomain },
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

        it('passes the member and read predicates to the domain', async () => {
            policyAbilityDomain.accessibleWhere.mockReturnValue(
                accessibleWhere
            );
            projectDomain.getListForMember.mockResolvedValue(page);

            const result = await service.getListForMember(
                'workspace-id',
                workspaceMember,
                query
            );

            expect(policyAbilityDomain.accessibleWhere).toHaveBeenCalledWith(
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
                accessibleWhere
            );
            expect(result).toEqual(page);
        });

        it('passes no policy predicate when the ability has no project read rules', async () => {
            policyAbilityDomain.accessibleWhere.mockReturnValue(null);
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
                undefined
            );
        });

        it('throws RequestContextMissingException when no ability is stored and never lists', async () => {
            policyAbilityDomain.requireStored.mockImplementation(() => {
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
            expect(policyAbilityDomain.requireStored).toHaveBeenCalledWith(
                PolicyAbilityStoreKey
            );
            expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
                ability,
                EnumPolicyAction.create,
                subject(EnumPolicySubject.Project, {
                    workspaceId: 'workspace-id',
                })
            );
            expect(projectDomain.createProject).toHaveBeenCalledWith(
                'workspace-id',
                'actor-id',
                { name: 'Project', description: 'About' }
            );
        });
    });

    describe('getProject', () => {
        it('authorizes and wraps the guarded project', () => {
            expect(service.getProject(project)).toEqual({ data: project });
            expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
                ability,
                EnumPolicyAction.read,
                subject(EnumPolicySubject.Project, project)
            );
        });
    });

    describe('getForAdmin', () => {
        it('authorizes and wraps the project loaded for administration', async () => {
            projectDomain.getByIdForAdmin.mockResolvedValue(project);

            await expect(service.getForAdmin('project-id')).resolves.toEqual({
                data: project,
            });
            expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
                ability,
                EnumPolicyAction.read,
                subject(EnumPolicySubject.Project, project)
            );
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
            expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
                ability,
                EnumPolicyAction.update,
                subject(EnumPolicySubject.Project, project)
            );
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
            expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
                ability,
                EnumPolicyAction.update,
                subject(EnumPolicySubject.Project, project)
            );
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

            expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
                ability,
                EnumPolicyAction.delete,
                subject(EnumPolicySubject.Project, project)
            );
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
            policyAbilityDomain.requireAccessibleWhere.mockReturnValue(
                accessibleWhere
            );
            projectDomain.getListForAdmin.mockResolvedValue(page);

            const result = await service.getListForAdmin(query);

            expect(
                policyAbilityDomain.requireAccessibleWhere
            ).toHaveBeenCalledWith(
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
            policyAbilityDomain.requireAccessibleWhere.mockReturnValue(
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
            policyAbilityDomain.requireStored.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(service.getListForAdmin({})).rejects.toThrow(
                RequestContextMissingException
            );
            expect(projectDomain.getListForAdmin).not.toHaveBeenCalled();
        });

        it('propagates the policy rejection when the ability holds no read rule and never lists', async () => {
            policyAbilityDomain.requireAccessibleWhere.mockImplementation(
                () => {
                    throw new PolicyForbiddenException();
                }
            );

            await expect(service.getListForAdmin({})).rejects.toThrow(
                PolicyForbiddenException
            );
            expect(projectDomain.getListForAdmin).not.toHaveBeenCalled();
        });
    });

    describe('getEffectivePermissions', () => {
        it('reads the stored ability and wraps the project permissions', () => {
            const permissions = mock<IEffectivePermission[]>();
            policyAbilityDomain.getEffectivePermissions.mockReturnValue(
                permissions
            );

            const result = service.getEffectivePermissions();

            expect(
                policyAbilityDomain.getEffectivePermissions
            ).toHaveBeenCalledWith(ability, ProjectPermissionSubjects);
            expect(result).toEqual({ data: { permissions } });
        });

        it('throws when the ability is absent from the store', () => {
            policyAbilityDomain.requireStored.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            expect(() => service.getEffectivePermissions()).toThrow(
                RequestContextMissingException
            );
        });
    });
});
