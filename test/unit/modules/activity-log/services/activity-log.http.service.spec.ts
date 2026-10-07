import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { ActivityLogAdminListRequestDto } from '@modules/activity-log/dtos/request/activity-log.admin-list.request.dto';
import type { ActivityLogAdminWorkspaceListRequestDto } from '@modules/activity-log/dtos/request/activity-log.admin-workspace-list.request.dto';
import type { ActivityLogSharedListRequestDto } from '@modules/activity-log/dtos/request/activity-log.shared-list.request.dto';
import { ActivityLogDefaultAvailableOrderBy } from '@modules/activity-log/constants/activity-log.list.constant';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { ActivityLogHttpService } from '@modules/activity-log/services/activity-log.http.service';

describe('ActivityLogHttpService', () => {
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const params = { skip: 0, limit: 20, orderBy: [] };
    const storePatch = { availableOrderBy: ActivityLogDefaultAvailableOrderBy };
    const offsetQuery: ActivityLogAdminListRequestDto = {};
    const workspaceQuery: ActivityLogAdminWorkspaceListRequestDto = {
        userId: 'user-1',
    };
    const workspaceQueryWithoutUser: ActivityLogAdminWorkspaceListRequestDto =
        {};
    const cursorQuery: ActivityLogSharedListRequestDto = {};
    const offsetPage = {
        type: EnumPaginationType.offset as const,
        count: 0,
        perPage: 20,
        hasNext: false,
        hasPrevious: false,
        page: 1,
        totalPage: 1,
        data: [],
    };
    const cursorPage = {
        type: EnumPaginationType.cursor as const,
        perPage: 20,
        hasNext: false,
        data: [],
    };

    let service: ActivityLogHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActivityLogHttpService,
                { provide: ActivityLogDomain, useValue: activityLogDomain },
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

        service = module.get(ActivityLogHttpService);
    });

    describe('getListOffsetByUser', () => {
        it('resolves offset pagination and returns the domain page', async () => {
            paginationQueryUtil.offset.mockReturnValue({ params, storePatch });
            activityLogDomain.getListOffsetByUser.mockResolvedValue(offsetPage);

            const result = await service.getListOffsetByUser(
                'user-1',
                offsetQuery
            );

            expect(result).toEqual(offsetPage);
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(
                offsetQuery,
                { availableOrderBy: ActivityLogDefaultAvailableOrderBy }
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                storePatch
            );
            expect(activityLogDomain.getListOffsetByUser).toHaveBeenCalledWith(
                'user-1',
                params
            );
        });
    });

    describe('getListCursorByUser', () => {
        it('resolves cursor pagination and returns the domain page', async () => {
            paginationQueryUtil.cursor.mockReturnValue({ params, storePatch });
            activityLogDomain.getListCursorByUser.mockResolvedValue(cursorPage);

            const result = await service.getListCursorByUser(
                'user-1',
                cursorQuery
            );

            expect(result).toEqual(cursorPage);
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(
                cursorQuery,
                { availableOrderBy: ActivityLogDefaultAvailableOrderBy }
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                storePatch
            );
            expect(activityLogDomain.getListCursorByUser).toHaveBeenCalledWith(
                'user-1',
                params
            );
        });
    });

    describe('getListOffsetByWorkspace', () => {
        it('resolves offset pagination and returns the domain page', async () => {
            paginationQueryUtil.offset.mockReturnValue({ params, storePatch });
            activityLogDomain.getListOffsetByWorkspace.mockResolvedValue(
                offsetPage
            );

            const result = await service.getListOffsetByWorkspace(
                'workspace-1',
                workspaceQuery
            );

            expect(result).toEqual(offsetPage);
            expect(
                activityLogDomain.getListOffsetByWorkspace
            ).toHaveBeenCalledWith('workspace-1', 'user-1', params);
        });

        it('passes null when the user filter is omitted', async () => {
            paginationQueryUtil.offset.mockReturnValue({ params, storePatch });
            activityLogDomain.getListOffsetByWorkspace.mockResolvedValue(
                offsetPage
            );

            await service.getListOffsetByWorkspace(
                'workspace-1',
                workspaceQueryWithoutUser
            );

            expect(
                activityLogDomain.getListOffsetByWorkspace
            ).toHaveBeenCalledWith('workspace-1', null, params);
        });
    });

    describe('getListCursorByWorkspace', () => {
        it('resolves cursor pagination and returns the domain page', async () => {
            paginationQueryUtil.cursor.mockReturnValue({ params, storePatch });
            activityLogDomain.getListCursorByWorkspace.mockResolvedValue(
                cursorPage
            );

            const result = await service.getListCursorByWorkspace(
                'workspace-1',
                null,
                cursorQuery
            );

            expect(result).toEqual(cursorPage);
            expect(
                activityLogDomain.getListCursorByWorkspace
            ).toHaveBeenCalledWith('workspace-1', null, params);
        });
    });
});
