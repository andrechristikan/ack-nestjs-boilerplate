import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { MessageService } from '@common/message/services/message.service';
import { RequestLanguageStoreKey } from '@common/request/constants/request.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type {
    Notification,
    NotificationUserSetting,
} from '@generated/prisma-client/client';
import {
    EnumActivityLogAction,
    EnumNotificationChannel,
    EnumNotificationPriority,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
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
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
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
                { provide: MessageService, useValue: messageService },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
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

        it('translates title and body in the request language with the primitive metadata values', async () => {
            const stored: Notification = {
                id: 'notification-id',
                userId: 'user-id',
                type: EnumNotificationType.userActivity,
                priority: EnumNotificationPriority.normal,
                title: 'notification.notify.welcome.title',
                body: 'notification.notify.welcome.body',
                metadata: { username: 'ana', age: 3, nested: { a: 1 } },
                isRead: false,
                readAt: null,
                createdAt: new Date('2024-01-01T00:00:00.000Z'),
                createdBy: null,
                updatedAt: new Date('2024-01-01T00:00:00.000Z'),
                updatedBy: null,
            };
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: {},
            });
            notificationDomain.getListCursor.mockResolvedValue({
                ...cursorPage,
                data: [stored],
            });
            requestStoreService.get.mockReturnValue('en');
            messageService.setMessage.mockImplementation(
                (path: string) => `translated:${path}`
            );

            const result = await service.getListCursor('user-id', query);

            expect(requestStoreService.get).toHaveBeenCalledWith(
                RequestLanguageStoreKey
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.notify.welcome.title',
                {
                    customLanguage: 'en',
                    properties: { username: 'ana', age: 3 },
                }
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.notify.welcome.body',
                {
                    customLanguage: 'en',
                    properties: { username: 'ana', age: 3 },
                }
            );
            expect(result.data).toEqual([
                {
                    ...stored,
                    title: 'translated:notification.notify.welcome.title',
                    body: 'translated:notification.notify.welcome.body',
                },
            ]);
        });

        it('translates the stored reject reason code into the label the body placeholder reads', async () => {
            const stored: Notification = {
                id: 'notification-id',
                userId: 'user-id',
                type: EnumNotificationType.userActivity,
                priority: EnumNotificationPriority.normal,
                title: 'notification.notify.workspaceJoinRejected.title',
                body: 'notification.notify.workspaceJoinRejected.body',
                metadata: {
                    username: 'ana',
                    workspaceName: 'Acme',
                    rejectReasonCode: 'spam',
                },
                isRead: false,
                readAt: null,
                createdAt: new Date('2024-01-01T00:00:00.000Z'),
                createdBy: null,
                updatedAt: new Date('2024-01-01T00:00:00.000Z'),
                updatedBy: null,
            };
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: {},
            });
            notificationDomain.getListCursor.mockResolvedValue({
                ...cursorPage,
                data: [stored],
            });
            requestStoreService.get.mockReturnValue('en');
            messageService.setMessage.mockImplementation(
                (path: string) => `translated:${path}`
            );

            await service.getListCursor('user-id', query);

            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.rejectReason.spam',
                { customLanguage: 'en' }
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.notify.workspaceJoinRejected.body',
                {
                    customLanguage: 'en',
                    properties: {
                        username: 'ana',
                        workspaceName: 'Acme',
                        rejectReasonCode: 'spam',
                        rejectReasonLabel:
                            'translated:notification.rejectReason.spam',
                    },
                }
            );
        });

        it('translates with no custom language and empty properties when none is stored and the metadata is null', async () => {
            const stored: Notification = {
                id: 'notification-id',
                userId: 'user-id',
                type: EnumNotificationType.securityAlert,
                priority: EnumNotificationPriority.normal,
                title: 'notification.notify.changePassword.title',
                body: 'notification.notify.changePassword.body',
                metadata: null,
                isRead: false,
                readAt: null,
                createdAt: new Date('2024-01-01T00:00:00.000Z'),
                createdBy: null,
                updatedAt: new Date('2024-01-01T00:00:00.000Z'),
                updatedBy: null,
            };
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: {},
            });
            notificationDomain.getListCursor.mockResolvedValue({
                ...cursorPage,
                data: [stored],
            });
            requestStoreService.get.mockReturnValue(null);
            messageService.setMessage.mockImplementation(
                (path: string) => path
            );

            await service.getListCursor('user-id', query);

            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.notify.changePassword.title',
                { properties: {} }
            );
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
        const data: NotificationUserSettingRequestDto = {
            channel: EnumNotificationChannel.email,
            type: EnumNotificationType.userActivity,
            isActive: true,
        };
        const stagedActivityLog: IActivityLogStaged = {
            action: EnumActivityLogAction.userUpdateNotificationSetting,
            metadata: {},
            userId: null,
            createdBy: null,
            workspaceId: null,
        };

        it('prepares the activity row, updates the setting, stages the row, and returns an empty response', async () => {
            activityLogDomain.prepare.mockReturnValue(stagedActivityLog);
            notificationDomain.updateUserSetting.mockResolvedValue(undefined);

            const result = await service.updateUserSetting('user-id', data);

            expect(result).toEqual({});
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userUpdateNotificationSetting,
                metadata: {
                    channel: data.channel,
                    type: data.type,
                    isActive: data.isActive,
                },
            });
            expect(notificationDomain.updateUserSetting).toHaveBeenCalledWith(
                'user-id',
                data
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });

        it('stages nothing when the domain update rejects', async () => {
            const failure = new Error('write failed');
            activityLogDomain.prepare.mockReturnValue(stagedActivityLog);
            notificationDomain.updateUserSetting.mockRejectedValue(failure);

            await expect(
                service.updateUserSetting('user-id', data)
            ).rejects.toBe(failure);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
