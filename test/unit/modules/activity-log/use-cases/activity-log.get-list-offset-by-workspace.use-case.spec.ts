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
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { ActivityLogAdminWorkspaceListRequestDto } from '@modules/activity-log/dtos/request/activity-log.admin-workspace-list.request.dto';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { ActivityLogGetListOffsetByWorkspaceUseCase } from '@modules/activity-log/use-cases/activity-log.get-list-offset-by-workspace.use-case';

describe('ActivityLogGetListOffsetByWorkspaceUseCase', () => {
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const params = {
        skip: 0,
        limit: 20,
        orderBy: [{ createdAt: 'desc' }],
    };
    const workspaceQuery: ActivityLogAdminWorkspaceListRequestDto = {
        userId: 'user-1',
    };
    const workspaceQueryWithoutUser: ActivityLogAdminWorkspaceListRequestDto =
        {};
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

    let useCase: ActivityLogGetListOffsetByWorkspaceUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActivityLogGetListOffsetByWorkspaceUseCase,
                { provide: ActivityLogService, useValue: activityLogService },
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

        useCase = module.get(ActivityLogGetListOffsetByWorkspaceUseCase);
    });

    describe('execute', () => {
        it('resolves offset pagination and returns the domain page', async () => {
            activityLogService.getListOffsetByWorkspace.mockResolvedValue(
                offsetPage
            );

            const result = await useCase.execute('workspace-1', workspaceQuery);

            expect(result).toEqual(offsetPage);
            expect(
                activityLogService.getListOffsetByWorkspace
            ).toHaveBeenCalledWith('workspace-1', 'user-1', params);
        });

        it('passes null when the user filter is omitted', async () => {
            activityLogService.getListOffsetByWorkspace.mockResolvedValue(
                offsetPage
            );

            await useCase.execute('workspace-1', workspaceQueryWithoutUser);

            expect(
                activityLogService.getListOffsetByWorkspace
            ).toHaveBeenCalledWith('workspace-1', null, params);
        });
    });
});
