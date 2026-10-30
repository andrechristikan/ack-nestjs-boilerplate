import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import {
    EnumActivityLogAction,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    Workspace,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { MembershipWorkspaceDomain } from '@modules/membership/domains/membership.workspace.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { WorkspaceCapReachedException } from '@modules/workspace/exceptions/workspace.cap-reached.exception';
import { WorkspaceMemberForbiddenException } from '@modules/workspace/exceptions/workspace.member-forbidden.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import {
    WorkspaceCursorAvailableOrderBy,
    WorkspaceDefaultAvailableOrderBy,
    WorkspaceDefaultAvailableSearch,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceAdminListRequestDto } from '@modules/workspace/dtos/request/workspace.admin-list.request.dto';
import type { WorkspaceCreateRequestDto } from '@modules/workspace/dtos/request/workspace.create.request.dto';
import type { WorkspaceSwitchRequestDto } from '@modules/workspace/dtos/request/workspace.switch.request.dto';
import type { WorkspaceUpdateIsPublicRequestDto } from '@modules/workspace/dtos/request/workspace.update-is-public.request.dto';
import type { WorkspaceUpdateSlugRequestDto } from '@modules/workspace/dtos/request/workspace.update-slug.request.dto';
import type { WorkspaceUpdateRequestDto } from '@modules/workspace/dtos/request/workspace.update.request.dto';
import type { WorkspaceUserListRequestDto } from '@modules/workspace/dtos/request/workspace.user-list.request.dto';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceHttpService } from '@modules/workspace/services/workspace.http.service';

describe('WorkspaceHttpService', () => {
    const workspaceDomain: MockProxy<WorkspaceDomain> = mock<WorkspaceDomain>();
    const workspaceMemberDomain: MockProxy<WorkspaceMemberDomain> =
        mock<WorkspaceMemberDomain>();
    const membershipWorkspaceDomain: MockProxy<MembershipWorkspaceDomain> =
        mock<MembershipWorkspaceDomain>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const featureFlagDomain: MockProxy<FeatureFlagDomain> =
        mock<FeatureFlagDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const workspace: Workspace = {
        id: 'workspace-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-1',
        deletedAt: null,
        deletedBy: null,
        name: 'Acme',
        slug: 'acme-team',
        description: null,
        isPublic: false,
    };
    const workspaceMember: WorkspaceMember = {
        id: 'member-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        workspaceId: 'workspace-1',
        userId: 'user-1',
        role: EnumWorkspaceMemberRole.member,
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const stagedActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.workspaceCreated,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    const offsetPagination: IPaginationQueryOffsetParams<Prisma.WorkspaceWhereInput> =
        { skip: 0, limit: 20, orderBy: [] };
    const cursorPagination: IPaginationQueryCursorParams<Prisma.WorkspaceWhereInput> =
        { limit: 20, orderBy: [] };

    let service: WorkspaceHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogDomain.prepare.mockReturnValue(stagedActivityLog);
        paginationQueryUtil.offset.mockReturnValue({
            params: offsetPagination,
            storePatch: {},
        });
        paginationQueryUtil.cursor.mockReturnValue({
            params: cursorPagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceHttpService,
                { provide: WorkspaceDomain, useValue: workspaceDomain },
                {
                    provide: WorkspaceMemberDomain,
                    useValue: workspaceMemberDomain,
                },
                {
                    provide: MembershipWorkspaceDomain,
                    useValue: membershipWorkspaceDomain,
                },
                { provide: UserDomain, useValue: userDomain },
                { provide: FeatureFlagDomain, useValue: featureFlagDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        service = module.get(WorkspaceHttpService);
    });

    describe('getListCursorByMember', () => {
        it('parses the cursor query, merges the store patch, and returns the page', async () => {
            const query: WorkspaceUserListRequestDto = {};
            const page: IResponsePaginationReturn<Workspace> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [workspace],
            };
            workspaceDomain.getListCursorByMember.mockResolvedValue(page);

            const result = await service.getListCursorByMember('user-1', query);

            expect(result).toEqual(page);
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableSearch: WorkspaceDefaultAvailableSearch,
                availableOrderBy: WorkspaceCursorAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {}
            );
            expect(workspaceDomain.getListCursorByMember).toHaveBeenCalledWith(
                'user-1',
                cursorPagination
            );
        });
    });

    describe('createWorkspace', () => {
        it('creates the workspace, stages the created activity after it, and wraps it in the response envelope', async () => {
            const body: WorkspaceCreateRequestDto = {
                name: 'Acme',
                description: 'Our team workspace',
                isPublic: true,
            };
            const callOrder: string[] = [];
            workspaceDomain.createWorkspace.mockImplementation(async () => {
                callOrder.push('create');

                return workspace;
            });
            activityLogDomain.prepare.mockImplementation(() => {
                callOrder.push('prepare');

                return stagedActivityLog;
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });

            const result = await service.createWorkspace('user-1', body);

            expect(result).toEqual({ data: workspace });
            expect(workspaceDomain.createWorkspace).toHaveBeenCalledWith(
                'user-1',
                {
                    name: 'Acme',
                    description: 'Our team workspace',
                    isPublic: true,
                }
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceCreated,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
            expect(callOrder).toEqual(['create', 'prepare', 'stage']);
        });

        it('passes null for an omitted description and visibility', async () => {
            const body: WorkspaceCreateRequestDto = { name: 'Acme' };
            workspaceDomain.createWorkspace.mockResolvedValue(workspace);

            await service.createWorkspace('user-1', body);

            expect(workspaceDomain.createWorkspace).toHaveBeenCalledWith(
                'user-1',
                { name: 'Acme', description: null, isPublic: null }
            );
        });

        it('stages nothing when the domain rejects', async () => {
            workspaceDomain.createWorkspace.mockRejectedValue(
                new WorkspaceCapReachedException()
            );

            await expect(
                service.createWorkspace('user-1', { name: 'Acme' })
            ).rejects.toBeInstanceOf(WorkspaceCapReachedException);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('getCurrentWorkspace', () => {
        it('wraps the current workspace in the response envelope', () => {
            const result = service.getCurrentWorkspace(workspace);

            expect(result).toEqual({ data: workspace });
        });
    });

    describe('updateWorkspace', () => {
        it('prepares the updated activity before the write, stages it after, and wraps the workspace', async () => {
            const body: WorkspaceUpdateRequestDto = {
                name: 'Acme 2',
                description: 'Our team workspace',
            };
            const callOrder: string[] = [];
            activityLogDomain.prepare.mockImplementation(() => {
                callOrder.push('prepare');

                return stagedActivityLog;
            });
            workspaceDomain.updateWorkspace.mockImplementation(async () => {
                callOrder.push('update');

                return workspace;
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });

            const result = await service.updateWorkspace(
                'workspace-1',
                'user-1',
                body
            );

            expect(result).toEqual({ data: workspace });
            expect(workspaceDomain.updateWorkspace).toHaveBeenCalledWith(
                'workspace-1',
                { name: 'Acme 2', description: 'Our team workspace' }
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceUpdated,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
            expect(callOrder).toEqual(['prepare', 'update', 'stage']);
        });

        it('passes a null description through to clear it', async () => {
            const body: WorkspaceUpdateRequestDto = {
                name: 'Acme 2',
                description: null,
            };
            workspaceDomain.updateWorkspace.mockResolvedValue(workspace);

            await service.updateWorkspace('workspace-1', 'user-1', body);

            expect(workspaceDomain.updateWorkspace).toHaveBeenCalledWith(
                'workspace-1',
                { name: 'Acme 2', description: null }
            );
        });

        it('stages nothing when the write rejects', async () => {
            workspaceDomain.updateWorkspace.mockRejectedValue(
                new WorkspaceNotFoundException()
            );

            await expect(
                service.updateWorkspace('workspace-1', 'user-1', {
                    name: 'Acme 2',
                    description: null,
                })
            ).rejects.toBeInstanceOf(WorkspaceNotFoundException);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('updateWorkspaceIsPublic', () => {
        it('prepares the visibility activity, writes, stages it, and wraps the workspace', async () => {
            const body: WorkspaceUpdateIsPublicRequestDto = { isPublic: true };
            workspaceDomain.updateWorkspaceIsPublic.mockResolvedValue(
                workspace
            );

            const result = await service.updateWorkspaceIsPublic(
                'workspace-1',
                'user-1',
                body
            );

            expect(result).toEqual({ data: workspace });
            expect(
                workspaceDomain.updateWorkspaceIsPublic
            ).toHaveBeenCalledWith('workspace-1', true);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceVisibilityUpdated,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });
    });

    describe('updateWorkspaceSlug', () => {
        it('prepares the updated activity, writes the slug, stages it, and wraps the workspace', async () => {
            const body: WorkspaceUpdateSlugRequestDto = { slug: 'new-slug' };
            workspaceDomain.updateWorkspaceSlug.mockResolvedValue(workspace);

            const result = await service.updateWorkspaceSlug(
                'workspace-1',
                'user-1',
                body
            );

            expect(result).toEqual({ data: workspace });
            expect(workspaceDomain.updateWorkspaceSlug).toHaveBeenCalledWith(
                'workspace-1',
                'new-slug'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceUpdated,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });

        it('stages nothing when the slug write rejects', async () => {
            workspaceDomain.updateWorkspaceSlug.mockRejectedValue(
                new WorkspaceNotFoundException()
            );

            await expect(
                service.updateWorkspaceSlug('workspace-1', 'user-1', {
                    slug: 'new-slug',
                })
            ).rejects.toBeInstanceOf(WorkspaceNotFoundException);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('switchWorkspace', () => {
        const body: WorkspaceSwitchRequestDto = { workspaceId: 'workspace-1' };

        it('guards the workspace then the membership, prepares the switched activity, sets the last workspace, and stages it', async () => {
            const callOrder: string[] = [];
            workspaceDomain.validateWorkspaceGuard.mockImplementation(
                async () => {
                    callOrder.push('workspaceGuard');

                    return workspace;
                }
            );
            workspaceMemberDomain.validateWorkspaceMemberGuard.mockImplementation(
                async () => {
                    callOrder.push('memberGuard');

                    return workspaceMember;
                }
            );
            activityLogDomain.prepare.mockImplementation(() => {
                callOrder.push('prepare');

                return stagedActivityLog;
            });
            userDomain.setLastWorkspace.mockImplementation(async () => {
                callOrder.push('setLastWorkspace');
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });

            const result = await service.switchWorkspace('user-1', body);

            expect(result).toEqual({});
            expect(callOrder).toEqual([
                'workspaceGuard',
                'memberGuard',
                'prepare',
                'setLastWorkspace',
                'stage',
            ]);
            expect(workspaceDomain.validateWorkspaceGuard).toHaveBeenCalledWith(
                'workspace-1'
            );
            expect(
                workspaceMemberDomain.validateWorkspaceMemberGuard
            ).toHaveBeenCalledWith('workspace-1', 'user-1');
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceSwitched,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
            });
            expect(userDomain.setLastWorkspace).toHaveBeenCalledWith(
                'user-1',
                'workspace-1'
            );
        });

        it('stops before the membership guard when the workspace guard rejects', async () => {
            workspaceDomain.validateWorkspaceGuard.mockRejectedValue(
                new WorkspaceNotFoundException()
            );

            await expect(
                service.switchWorkspace('user-1', body)
            ).rejects.toBeInstanceOf(WorkspaceNotFoundException);
            expect(
                workspaceMemberDomain.validateWorkspaceMemberGuard
            ).not.toHaveBeenCalled();
            expect(userDomain.setLastWorkspace).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('switches nothing and stages nothing when the membership guard rejects', async () => {
            workspaceDomain.validateWorkspaceGuard.mockResolvedValue(workspace);
            workspaceMemberDomain.validateWorkspaceMemberGuard.mockRejectedValue(
                new WorkspaceMemberForbiddenException()
            );

            await expect(
                service.switchWorkspace('user-1', body)
            ).rejects.toBeInstanceOf(WorkspaceMemberForbiddenException);
            expect(userDomain.setLastWorkspace).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('softDeleteWorkspace', () => {
        it('prepares the deleted activity, soft-deletes through the membership composition, and stages it', async () => {
            const callOrder: string[] = [];
            activityLogDomain.prepare.mockImplementation(() => {
                callOrder.push('prepare');

                return stagedActivityLog;
            });
            membershipWorkspaceDomain.softDelete.mockImplementation(
                async () => {
                    callOrder.push('softDelete');
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });

            const result = await service.softDeleteWorkspace(
                'workspace-1',
                'user-1'
            );

            expect(result).toEqual({});
            expect(membershipWorkspaceDomain.softDelete).toHaveBeenCalledWith(
                'workspace-1',
                'user-1'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceDeleted,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
            });
            expect(callOrder).toEqual(['prepare', 'softDelete', 'stage']);
        });

        it('stages nothing when the composition rejects', async () => {
            membershipWorkspaceDomain.softDelete.mockRejectedValue(
                new WorkspaceNotFoundException()
            );

            await expect(
                service.softDeleteWorkspace('workspace-1', 'user-1')
            ).rejects.toBeInstanceOf(WorkspaceNotFoundException);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('getListOffsetByAdmin', () => {
        it('parses the offset query, merges the isPublic filter, and returns the page', async () => {
            const query: WorkspaceAdminListRequestDto = { isPublic: true };
            const isPublicFilter = {
                where: { isPublic: { equals: true } },
                storeFilter: { isPublic: true },
            };
            paginationQueryUtil.equalBoolean.mockReturnValue(isPublicFilter);
            const page: IResponsePaginationReturn<Workspace> = {
                type: EnumPaginationType.offset,
                count: 1,
                perPage: 20,
                page: 1,
                totalPage: 1,
                hasNext: false,
                hasPrevious: false,
                data: [workspace],
            };
            workspaceDomain.getListOffsetByAdmin.mockResolvedValue(page);

            const result = await service.getListOffsetByAdmin(query);

            expect(result).toEqual(page);
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableSearch: WorkspaceDefaultAvailableSearch,
                availableOrderBy: WorkspaceDefaultAvailableOrderBy,
            });
            expect(paginationQueryUtil.equalBoolean).toHaveBeenCalledWith(
                Prisma.WorkspaceScalarFieldEnum.isPublic,
                true
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: { isPublic: true } }
            );
            expect(workspaceDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                offsetPagination,
                { isPublic: { equals: true } }
            );
        });

        it('merges an empty filter set when isPublic is absent', async () => {
            const query: WorkspaceAdminListRequestDto = {};
            paginationQueryUtil.equalBoolean.mockReturnValue(null);
            const page: IResponsePaginationReturn<Workspace> = {
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                page: 1,
                totalPage: 0,
                hasNext: false,
                hasPrevious: false,
                data: [],
            };
            workspaceDomain.getListOffsetByAdmin.mockResolvedValue(page);

            await service.getListOffsetByAdmin(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: {} }
            );
            expect(workspaceDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                offsetPagination,
                undefined
            );
        });
    });

    describe('getByIdByAdmin', () => {
        it('wraps the workspace resolved for admin', async () => {
            workspaceDomain.getByIdByAdmin.mockResolvedValue(workspace);

            const result = await service.getByIdByAdmin('workspace-1');

            expect(result).toEqual({ data: workspace });
            expect(workspaceDomain.getByIdByAdmin).toHaveBeenCalledWith(
                'workspace-1'
            );
        });
    });

    describe('previewWorkspace', () => {
        it('gates on the join request flag then wraps the public workspace preview', async () => {
            const callOrder: string[] = [];
            featureFlagDomain.validateFeatureFlagMetadata.mockImplementation(
                async () => {
                    callOrder.push('gate');
                }
            );
            workspaceDomain.previewWorkspace.mockImplementation(async () => {
                callOrder.push('preview');

                return workspace;
            });

            const result = await service.previewWorkspace('acme-team');

            expect(result).toEqual({ data: workspace });
            expect(
                featureFlagDomain.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith('workspace', 'joinRequestAllowed');
            expect(workspaceDomain.previewWorkspace).toHaveBeenCalledWith(
                'acme-team'
            );
            expect(callOrder).toEqual(['gate', 'preview']);
        });

        it('looks up nothing when the gate rejects', async () => {
            featureFlagDomain.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                service.previewWorkspace('acme-team')
            ).rejects.toBeInstanceOf(FeatureFlagDisabledException);
            expect(workspaceDomain.previewWorkspace).not.toHaveBeenCalled();
        });
    });
});
