import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { MessageService } from '@common/message/services/message.service';
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
import { ActivityLogGetListCursorByWorkspaceUseCase } from '@modules/activity-log/use-cases/activity-log.get-list-cursor-by-workspace.use-case';

describe('ActivityLogGetListCursorByWorkspaceUseCase', () => {
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const params = {
        limit: 20,
        orderBy: [{ createdAt: 'desc' }],
        fingerprint: 'b6149919d542defa',
    };
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
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActivityLogGetListCursorByWorkspaceUseCase,
                { provide: ActivityLogService, useValue: activityLogService },
                ActivityLogUtil,
                { provide: MessageService, useValue: mock<MessageService>() },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
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
            activityLogService.getListCursorByWorkspace.mockResolvedValue(
                cursorPage
            );

            const result = await useCase.execute(
                authContext,
                workspaceContext,
                cursorQuery
            );

            expect(result).toEqual(cursorPage);
            expect(
                activityLogService.getListCursorByWorkspace
            ).toHaveBeenCalledWith(
                workspaceContext.workspace.id,
                authContext.userId,
                params
            );
        });

        it('masks every row the reader did not create', async () => {
            const own = buildActivityLog('log-1', 'user-1');
            const other = buildActivityLog('log-2', 'admin-1');
            const hidden = {
                ...other,
                ipAddress: null,
                userAgent: null,
                geoLocation: null,
                createdBy: null,
            };
            activityLogService.getListCursorByWorkspace.mockResolvedValue({
                ...cursorPage,
                hasNext: true,
                data: [own, other],
            });

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
        });
    });
});
