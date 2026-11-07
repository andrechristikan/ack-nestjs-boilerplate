import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { MessageService } from '@common/message/services/message.service';
import { RequestLanguageStoreKey } from '@common/request/constants/request.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { Notification } from '@generated/prisma-client/client';
import {
    EnumNotificationPriority,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import { NotificationService } from '@modules/notification/services/notification.service';
import type { NotificationListRequestDto } from '@modules/notification/dtos/request/notification.list.request.dto';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import {
    NotificationDefaultAvailableOrderBy,
    NotificationSharedListCursorScope,
} from '@modules/notification/constants/notification.list.constant';
import { NotificationGetListCursorUseCase } from '@modules/notification/use-cases/notification.get-list-cursor.use-case';

describe('NotificationGetListCursorUseCase', () => {
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const notificationUtil: MockProxy<NotificationUtil> =
        mock<NotificationUtil>();
    let useCase: NotificationGetListCursorUseCase;

    const cursorParams = {
        limit: 20,
        orderBy: [],
        fingerprint: 'aaaaaaaaaaaaaaaa',
    };
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
                NotificationGetListCursorUseCase,
                { provide: NotificationService, useValue: notificationService },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
                { provide: MessageService, useValue: messageService },
                { provide: NotificationUtil, useValue: notificationUtil },
            ],
        }).compile();
        useCase = module.get(NotificationGetListCursorUseCase);
    });

    describe('execute', () => {
        const query: NotificationListRequestDto = { perPage: 20 };

        it('merges the pagination store patch and returns the domain page', async () => {
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: { filters: { existing: true } },
            });
            notificationService.getListCursor.mockResolvedValue(cursorPage);

            const result = await useCase.execute('user-id', query);

            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                scope: NotificationSharedListCursorScope,
                availableOrderBy: NotificationDefaultAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: { existing: true } }
            );
            expect(notificationService.getListCursor).toHaveBeenCalledWith(
                'user-id',
                cursorParams
            );
            expect(result).toEqual(cursorPage);
        });

        it('translates title and body in the request language with the properties NotificationUtil shapes from the metadata', async () => {
            const stored: Notification = {
                id: 'notification-id',
                userId: 'user-id',
                type: EnumNotificationType.userActivity,
                priority: EnumNotificationPriority.normal,
                title: 'notification.notify.workspaceJoinRejected.title',
                body: 'notification.notify.workspaceJoinRejected.body',
                metadata: { username: 'ana', rejectReasonCode: 'spam' },
                isRead: false,
                readAt: null,
                createdAt: new Date('2024-01-01T00:00:00.000Z'),
                createdBy: null,
                updatedAt: new Date('2024-01-01T00:00:00.000Z'),
                updatedBy: null,
            };
            const metadataProperties = {
                username: 'ana',
                rejectReasonCode: 'spam',
            };
            const properties = {
                ...metadataProperties,
                rejectReasonLabel: 'Spam',
            };
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: {},
            });
            notificationService.getListCursor.mockResolvedValue({
                ...cursorPage,
                data: [stored],
            });
            requestStoreService.get.mockReturnValue('en');
            notificationUtil.toMessageProperties.mockReturnValue(
                metadataProperties
            );
            notificationUtil.toRejectReasonProperties.mockReturnValue(
                properties
            );
            messageService.setMessage.mockImplementation(
                (path: string) => `translated:${path}`
            );

            const result = await useCase.execute('user-id', query);

            expect(requestStoreService.get).toHaveBeenCalledWith(
                RequestLanguageStoreKey
            );
            expect(notificationUtil.toMessageProperties).toHaveBeenCalledWith(
                stored.metadata
            );
            expect(
                notificationUtil.toRejectReasonProperties
            ).toHaveBeenCalledWith(metadataProperties, 'en');
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.notify.workspaceJoinRejected.title',
                { customLanguage: 'en', properties }
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.notify.workspaceJoinRejected.body',
                { customLanguage: 'en', properties }
            );
            expect(result.data).toEqual([
                {
                    ...stored,
                    title: 'translated:notification.notify.workspaceJoinRejected.title',
                    body: 'translated:notification.notify.workspaceJoinRejected.body',
                },
            ]);
        });

        it('translates with no custom language when none is stored', async () => {
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
            notificationService.getListCursor.mockResolvedValue({
                ...cursorPage,
                data: [stored],
            });
            requestStoreService.get.mockReturnValue(null);
            notificationUtil.toMessageProperties.mockReturnValue({});
            notificationUtil.toRejectReasonProperties.mockReturnValue({});
            messageService.setMessage.mockImplementation(
                (path: string) => path
            );

            await useCase.execute('user-id', query);

            expect(
                notificationUtil.toRejectReasonProperties
            ).toHaveBeenCalledWith({}, null);
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.notify.changePassword.title',
                { properties: {} }
            );
        });
    });
});
