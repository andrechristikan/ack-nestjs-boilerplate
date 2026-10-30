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
import {
    EnumActivityLogAction,
    EnumWorkspaceMemberRole,
    Prisma,
} from '@generated/prisma-client/client';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { WorkspaceLastOwnerException } from '@modules/workspace/exceptions/workspace.last-owner.exception';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { WorkspaceSelfTransferException } from '@modules/workspace/exceptions/workspace.self-transfer.exception';
import {
    WorkspaceMemberDefaultAvailableOrderBy,
    WorkspaceMemberDefaultRole,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceAdminMemberListRequestDto } from '@modules/workspace/dtos/request/workspace.admin-member-list.request.dto';
import type { WorkspaceMemberListRequestDto } from '@modules/workspace/dtos/request/workspace.member-list.request.dto';
import type { WorkspaceMemberUpdateRoleRequestDto } from '@modules/workspace/dtos/request/workspace.member-update-role.request.dto';
import type { WorkspaceTransferOwnershipRequestDto } from '@modules/workspace/dtos/request/workspace.transfer-ownership.request.dto';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import type { IWorkspaceMember } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceMemberHttpService } from '@modules/workspace/services/http/workspace.member.http.service';

describe('WorkspaceMemberHttpService', () => {
    const workspaceMemberDomain: MockProxy<WorkspaceMemberDomain> =
        mock<WorkspaceMemberDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const member: WorkspaceMember = {
        id: 'member-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        workspaceId: 'workspace-1',
        userId: 'user-1',
        role: EnumWorkspaceMemberRole.owner,
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    const stagedActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.workspaceMemberLeft,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };

    const cursorPagination: IPaginationQueryCursorParams<Prisma.WorkspaceMemberWhereInput> =
        { limit: 20, orderBy: [] };
    const offsetPagination: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput> =
        { skip: 0, limit: 20, orderBy: [] };

    let service: WorkspaceMemberHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogDomain.prepare.mockReturnValue(stagedActivityLog);
        paginationQueryUtil.cursor.mockReturnValue({
            params: cursorPagination,
            storePatch: {},
        });
        paginationQueryUtil.offset.mockReturnValue({
            params: offsetPagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceMemberHttpService,
                {
                    provide: WorkspaceMemberDomain,
                    useValue: workspaceMemberDomain,
                },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        service = module.get(WorkspaceMemberHttpService);
    });

    describe('transferOwnership', () => {
        it('prepares both ownership rows, transfers, and stages them after the transfer', async () => {
            const body: WorkspaceTransferOwnershipRequestDto = {
                targetUserId: 'user-2',
            };
            const callOrder: string[] = [];
            activityLogDomain.prepare.mockImplementation(() => {
                callOrder.push('prepare');

                return stagedActivityLog;
            });
            workspaceMemberDomain.transferOwnership.mockImplementation(
                async () => {
                    callOrder.push('transfer');
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });

            const result = await service.transferOwnership(
                'workspace-1',
                member,
                body
            );

            expect(result).toEqual({});
            expect(
                workspaceMemberDomain.transferOwnership
            ).toHaveBeenCalledWith('workspace-1', member, 'user-2');
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.workspaceOwnershipTransferred,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { targetUserId: 'user-2' },
            });
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.workspaceOwnershipTransferredByOwner,
                userId: 'user-2',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { actorUserId: 'user-1' },
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
                stagedActivityLog,
            ]);
            expect(callOrder).toEqual([
                'prepare',
                'prepare',
                'transfer',
                'stage',
            ]);
        });

        it('stages nothing when the transfer rejects', async () => {
            workspaceMemberDomain.transferOwnership.mockRejectedValue(
                new WorkspaceSelfTransferException()
            );

            await expect(
                service.transferOwnership('workspace-1', member, {
                    targetUserId: 'user-1',
                })
            ).rejects.toBeInstanceOf(WorkspaceSelfTransferException);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('leaveWorkspace', () => {
        it('prepares the left row, removes the member, and stages it after', async () => {
            const callOrder: string[] = [];
            activityLogDomain.prepare.mockImplementation(() => {
                callOrder.push('prepare');

                return stagedActivityLog;
            });
            workspaceMemberDomain.leaveWorkspace.mockImplementation(
                async () => {
                    callOrder.push('leave');
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });

            const result = await service.leaveWorkspace('workspace-1', member);

            expect(result).toEqual({});
            expect(workspaceMemberDomain.leaveWorkspace).toHaveBeenCalledWith(
                'workspace-1',
                member
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceMemberLeft,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
            });
            expect(callOrder).toEqual(['prepare', 'leave', 'stage']);
        });

        it('stages nothing when leaving rejects', async () => {
            workspaceMemberDomain.leaveWorkspace.mockRejectedValue(
                new WorkspaceLastOwnerException()
            );

            await expect(
                service.leaveWorkspace('workspace-1', member)
            ).rejects.toBeInstanceOf(WorkspaceLastOwnerException);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('getMembersList', () => {
        it('parses the cursor query, merges the role filter, and returns the page', async () => {
            const query: WorkspaceMemberListRequestDto = { role: 'admin' };
            const roleFilter = {
                where: { role: { in: [EnumWorkspaceMemberRole.admin] } },
                storeFilter: { role: [EnumWorkspaceMemberRole.admin] },
            };
            paginationQueryUtil.inEnum.mockReturnValue(roleFilter);
            const page: IResponsePaginationReturn<IWorkspaceMember> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            workspaceMemberDomain.getMembersList.mockResolvedValue(page);

            await service.getMembersList('workspace-1', query);

            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableOrderBy: WorkspaceMemberDefaultAvailableOrderBy,
            });
            expect(paginationQueryUtil.inEnum).toHaveBeenCalledWith(
                Prisma.WorkspaceMemberScalarFieldEnum.role,
                'admin',
                WorkspaceMemberDefaultRole
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: { role: [EnumWorkspaceMemberRole.admin] } }
            );
            expect(workspaceMemberDomain.getMembersList).toHaveBeenCalledWith(
                'workspace-1',
                cursorPagination,
                roleFilter.where
            );
        });

        it('merges an empty filter set when role is absent', async () => {
            paginationQueryUtil.inEnum.mockReturnValue(null);
            const page: IResponsePaginationReturn<IWorkspaceMember> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            workspaceMemberDomain.getMembersList.mockResolvedValue(page);

            await service.getMembersList('workspace-1', {});

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: {} }
            );
        });
    });

    describe('updateMemberRole', () => {
        const target: WorkspaceMember = {
            ...member,
            id: 'member-2',
            userId: 'user-2',
            role: EnumWorkspaceMemberRole.member,
        };

        it('updates the role then stages the actor row and the target row from the returned target', async () => {
            const body: WorkspaceMemberUpdateRoleRequestDto = {
                role: EnumWorkspaceMemberRole.admin,
            };
            workspaceMemberDomain.updateMemberRole.mockResolvedValue(target);

            const result = await service.updateMemberRole(
                'workspace-1',
                member,
                'member-2',
                body
            );

            expect(result).toEqual({});
            expect(workspaceMemberDomain.updateMemberRole).toHaveBeenCalledWith(
                'workspace-1',
                member,
                'member-2',
                EnumWorkspaceMemberRole.admin
            );
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.workspaceMemberRoleUpdated,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { targetUserId: 'user-2' },
            });
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.workspaceMemberRoleUpdatedByAdmin,
                userId: 'user-2',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { actorUserId: 'user-1' },
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
                stagedActivityLog,
            ]);
        });

        it('stages nothing when the update rejects', async () => {
            workspaceMemberDomain.updateMemberRole.mockRejectedValue(
                new WorkspaceMemberNotFoundException()
            );

            await expect(
                service.updateMemberRole('workspace-1', member, 'member-2', {
                    role: EnumWorkspaceMemberRole.admin,
                })
            ).rejects.toBeInstanceOf(WorkspaceMemberNotFoundException);
            expect(activityLogDomain.prepare).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('removeMember', () => {
        it('removes the member then stages the actor row and the target row from the returned target', async () => {
            const target: WorkspaceMember = {
                ...member,
                id: 'member-2',
                userId: 'user-2',
                role: EnumWorkspaceMemberRole.member,
            };
            workspaceMemberDomain.removeMember.mockResolvedValue(target);

            const result = await service.removeMember(
                'workspace-1',
                member,
                'member-2'
            );

            expect(result).toEqual({});
            expect(workspaceMemberDomain.removeMember).toHaveBeenCalledWith(
                'workspace-1',
                member,
                'member-2'
            );
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.workspaceMemberRemoved,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { targetUserId: 'user-2' },
            });
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.workspaceMemberRemovedByAdmin,
                userId: 'user-2',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { actorUserId: 'user-1' },
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
                stagedActivityLog,
            ]);
        });

        it('stages nothing when the removal rejects', async () => {
            workspaceMemberDomain.removeMember.mockRejectedValue(
                new WorkspaceMemberNotFoundException()
            );

            await expect(
                service.removeMember('workspace-1', member, 'member-2')
            ).rejects.toBeInstanceOf(WorkspaceMemberNotFoundException);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('getMembersListByAdmin', () => {
        it('parses the offset query, merges the store patch, and returns the page', async () => {
            const query: WorkspaceAdminMemberListRequestDto = {};
            const page: IResponsePaginationReturn<IWorkspaceMember> = {
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                page: 1,
                totalPage: 0,
                hasNext: false,
                hasPrevious: false,
                data: [],
            };
            workspaceMemberDomain.getMembersListByAdmin.mockResolvedValue(page);

            await service.getMembersListByAdmin('workspace-1', query);

            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableOrderBy: WorkspaceMemberDefaultAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {}
            );
            expect(
                workspaceMemberDomain.getMembersListByAdmin
            ).toHaveBeenCalledWith('workspace-1', offsetPagination);
        });
    });
});
