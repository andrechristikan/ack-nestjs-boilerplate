import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    buildUser,
    buildWorkspace,
    buildWorkspaceMember,
    buildAuthJwtAccessContext,
    buildWorkspaceContext,
} from '@test/unit/helpers/test.unit.request.helper';
import type { ActivityLogSharedListRequestDto } from '@modules/activity-log/dtos/request/activity-log.shared-list.request.dto';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { buildActivityLog } from '@test/unit/helpers/test.unit.activity-log.helper';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    ActivityLogOrderBy,
    ActivityLogSharedWorkspaceListCursorScope,
} from '@modules/activity-log/constants/activity-log.list.constant';
import { ActivityLogGetListCursorByWorkspaceUseCase } from '@modules/activity-log/use-cases/activity-log.get-list-cursor-by-workspace.use-case';
import { EnumActivityLogOrderBy } from '@modules/activity-log/enums/activity-log.enum';

describe('ActivityLogGetListCursorByWorkspaceUseCase', () => {
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const activityLogUtil: MockProxy<ActivityLogUtil> = mock<ActivityLogUtil>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const params = {
        skip: 0,
        limit: 20,
        orderBy: [],
        fingerprint: 'aaaaaaaaaaaaaaaa',
    };
    const storePatch = { perPage: 20 };
    const cursorQuery: ActivityLogSharedListRequestDto = {};
    const cursorPage = {
        type: EnumPaginationType.cursor as const,
        perPage: 20,
        hasNext: false,
        data: [],
    };

    const user = buildUser('user-1', 'user@example.com');
    const authContext = buildAuthJwtAccessContext(user.id);
    const workspaceContext = buildWorkspaceContext(
        buildWorkspace(),
        buildWorkspaceMember(user.id)
    );
    let useCase: ActivityLogGetListCursorByWorkspaceUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActivityLogGetListCursorByWorkspaceUseCase,
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: ActivityLogUtil, useValue: activityLogUtil },
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

        useCase = module.get(ActivityLogGetListCursorByWorkspaceUseCase);
    });

    describe('execute', () => {
        it('resolves cursor pagination and returns the domain page', async () => {
            paginationQueryUtil.cursor.mockReturnValue({ params, storePatch });
            activityLogService.getListCursorByWorkspace.mockResolvedValue(
                cursorPage
            );
            activityLogUtil.toMaskedList.mockReturnValue(cursorPage.data);

            const result = await useCase.execute(
                authContext,
                workspaceContext,
                cursorQuery
            );

            expect(result).toEqual(cursorPage);
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(
                cursorQuery,
                {
                    scope: ActivityLogSharedWorkspaceListCursorScope,
                    orderBy: ActivityLogOrderBy,
                    defaultOrderBy: EnumActivityLogOrderBy.latest,
                }
            );
            expect(
                activityLogService.getListCursorByWorkspace
            ).toHaveBeenCalledWith(
                workspaceContext.workspace.id,
                authContext.userId,
                params
            );
        });

        it('maps every row of the page through toMaskedList with the reader id', async () => {
            const own = buildActivityLog('log-1', 'user-1');
            const other = buildActivityLog('log-2', 'admin-1');
            const hidden = {
                ...other,
                ipAddress: null,
                userAgent: null,
                geoLocation: null,
                createdBy: null,
            };
            paginationQueryUtil.cursor.mockReturnValue({ params, storePatch });
            activityLogService.getListCursorByWorkspace.mockResolvedValue({
                ...cursorPage,
                hasNext: true,
                data: [own, other],
            });
            activityLogUtil.toMaskedList.mockReturnValue([own, hidden]);

            const result = await useCase.execute(
                authContext,
                workspaceContext,
                cursorQuery
            );

            expect(result).toEqual({
                ...cursorPage,
                hasNext: true,
                data: [own, hidden],
            });
            expect(activityLogUtil.toMaskedList).toHaveBeenCalledWith(
                [own, other],
                'user-1'
            );
        });
    });
});
