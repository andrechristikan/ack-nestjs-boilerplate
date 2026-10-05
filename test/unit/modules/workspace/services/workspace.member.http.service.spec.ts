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
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import type { WorkspaceMember } from '@generated/prisma-client/client';
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
import { WorkspaceMemberHttpService } from '@modules/workspace/services/workspace.member.http.service';

describe('WorkspaceMemberHttpService', () => {
    const workspaceMemberDomain: MockProxy<WorkspaceMemberDomain> =
        mock<WorkspaceMemberDomain>();
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

    const cursorPagination: IPaginationQueryCursorParams<Prisma.WorkspaceMemberWhereInput> =
        { limit: 20, orderBy: [] };
    const offsetPagination: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput> =
        { skip: 0, limit: 20, orderBy: [] };

    let service: WorkspaceMemberHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
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
        it('transfers ownership to the target user', async () => {
            const body: WorkspaceTransferOwnershipRequestDto = {
                targetUserId: 'user-2',
            };

            await service.transferOwnership('workspace-1', member, body);

            expect(
                workspaceMemberDomain.transferOwnership
            ).toHaveBeenCalledWith('workspace-1', member, 'user-2');
        });
    });

    describe('leaveWorkspace', () => {
        it('removes the member from the workspace', async () => {
            await service.leaveWorkspace('workspace-1', member);

            expect(workspaceMemberDomain.leaveWorkspace).toHaveBeenCalledWith(
                'workspace-1',
                member
            );
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
            paginationQueryUtil.inEnum.mockReturnValue(undefined);
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
        it('updates the member role', async () => {
            const body: WorkspaceMemberUpdateRoleRequestDto = {
                role: EnumWorkspaceMemberRole.admin,
            };

            await service.updateMemberRole(
                'workspace-1',
                member,
                'member-2',
                body
            );

            expect(workspaceMemberDomain.updateMemberRole).toHaveBeenCalledWith(
                'workspace-1',
                member,
                'member-2',
                EnumWorkspaceMemberRole.admin
            );
        });
    });

    describe('removeMember', () => {
        it('removes the target member', async () => {
            await service.removeMember('workspace-1', member, 'member-2');

            expect(workspaceMemberDomain.removeMember).toHaveBeenCalledWith(
                'workspace-1',
                member,
                'member-2'
            );
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
