import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type {
    Notification,
    NotificationUserSetting,
} from '@generated/prisma-client/client';
import {
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import type { NotificationListRequestDto } from '@modules/notification/dtos/request/notification.list.request.dto';
import type { NotificationUserSettingRequestDto } from '@modules/notification/dtos/request/notification.user-setting.request.dto';
import { NotificationHttpService } from '@modules/notification/services/notification.http.service';
import { NotificationDefaultAvailableOrderBy } from '@modules/notification/constants/notification.list.constant';

describe('NotificationHttpService', () => {
    const notificationDomain: MockProxy<NotificationDomain> =
        mock<NotificationDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    let service: NotificationHttpService;

    const cursorParams = { limit: 20, orderBy: [] };
    const cursorPage = {
        type: EnumPaginationType.cursor as const,
        perPage: 20,
        hasNext: false,
        data: [] as Notification[],
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                NotificationHttpService,
                { provide: NotificationDomain, useValue: notificationDomain },
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
        service = module.get(NotificationHttpService);
    });

    describe('getListCursor', () => {
        const query: NotificationListRequestDto = { perPage: 20 };

        it('merges the pagination store patch and returns the domain page', async () => {
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: { filters: { existing: true } },
            });
            notificationDomain.getListCursor.mockResolvedValue(cursorPage);

            const result = await service.getListCursor('user-id', query);

            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableOrderBy: NotificationDefaultAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: { existing: true } }
            );
            expect(notificationDomain.getListCursor).toHaveBeenCalledWith(
                'user-id',
                cursorParams
            );
            expect(result).toEqual(cursorPage);
        });
    });

    describe('getListUserSetting', () => {
        it('wraps the settings list in the response envelope', async () => {
            const settings: NotificationUserSetting[] = [];
            notificationDomain.getListUserSetting.mockResolvedValue(settings);

            const result = await service.getListUserSetting('user-id');

            expect(notificationDomain.getListUserSetting).toHaveBeenCalledWith(
                'user-id'
            );
            expect(result).toEqual({ data: { settings } });
        });
    });

    describe('markAsRead', () => {
        it('returns an empty response after marking the notification read', async () => {
            notificationDomain.markAsRead.mockResolvedValue(undefined);

            const result = await service.markAsRead(
                'user-id',
                'notification-id'
            );

            expect(notificationDomain.markAsRead).toHaveBeenCalledWith(
                'user-id',
                'notification-id'
            );
            expect(result).toEqual({});
        });
    });

    describe('markAllAsRead', () => {
        it('returns the updated count as messageProperties metadata', async () => {
            notificationDomain.markAllAsRead.mockResolvedValue(4);

            const result = await service.markAllAsRead('user-id');

            expect(notificationDomain.markAllAsRead).toHaveBeenCalledWith(
                'user-id'
            );
            expect(result).toEqual({
                metadata: { messageProperties: { count: 4 } },
            });
        });
    });

    describe('updateUserSetting', () => {
        it('returns an empty response after updating the setting', async () => {
            const data: NotificationUserSettingRequestDto = {
                channel: EnumNotificationChannel.email,
                type: EnumNotificationType.userActivity,
                isActive: true,
            };
            notificationDomain.updateUserSetting.mockResolvedValue(undefined);

            const result = await service.updateUserSetting('user-id', data);

            expect(notificationDomain.updateUserSetting).toHaveBeenCalledWith(
                'user-id',
                data
            );
            expect(result).toEqual({});
        });
    });
});
