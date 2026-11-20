import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import { MessageService } from '@common/message/services/message.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { Notification } from '@generated/prisma-client/client';
import {
    EnumNotificationPriority,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import { NotificationService } from '@modules/notification/services/notification.service';
import type { NotificationListRequestDto } from '@modules/notification/dtos/request/notification.list.request.dto';
import { NotificationGetListCursorUseCase } from '@modules/notification/use-cases/notification.get-list-cursor.use-case';
import {
    buildUser,
    buildRequestContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('NotificationGetListCursorUseCase', () => {
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const userContext = buildUserContext(
        buildUser('user-id', 'user@example.com')
    );
    const requestContext = buildRequestContext();
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    let useCase: NotificationGetListCursorUseCase;

    const cursorParams = {
        limit: 20,
        orderBy: [{ createdAt: EnumPaginationOrderDirectionType.desc }],
        fingerprint: '109da1a6c02bf8ef',
    };
    const storePatch = {
        perPage: 20,
        orderBy: 'latest',
        availableSearch: [],
        availableOrderBy: ['latest'],
    };
    const cursorPage = {
        type: EnumPaginationType.cursor as const,
        perPage: 20,
        hasNext: false,
        data: [] as Notification[],
    };

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                NotificationGetListCursorUseCase,
                { provide: NotificationService, useValue: notificationService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
                { provide: MessageService, useValue: messageService },
            ],
        }).compile();
        useCase = module.get(NotificationGetListCursorUseCase);
    });

    describe('execute', () => {
        const query: NotificationListRequestDto = { perPage: 20 };

        it('merges the pagination store patch and returns the domain page', async () => {
            notificationService.getListCursor.mockResolvedValue(cursorPage);

            const result = await useCase.execute(
                requestContext,
                authContext,
                query
            );

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                storePatch
            );
            expect(notificationService.getListCursor).toHaveBeenCalledWith(
                'user-id',
                cursorParams
            );
            expect(result).toEqual(cursorPage);
        });

        it('translates title and body in the request language with the properties NotificationService shapes from the metadata', async () => {
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
            notificationService.getListCursor.mockResolvedValue({
                ...cursorPage,
                data: [stored],
            });
            notificationService.toMessageProperties.mockReturnValue(
                metadataProperties
            );
            notificationService.toRejectReasonProperties.mockReturnValue(
                properties
            );
            messageService.setMessage.mockImplementation(
                (path: string) => `translated:${path}`
            );

            const result = await useCase.execute(
                requestContext,
                authContext,
                query
            );

            expect(requestStoreService.get).not.toHaveBeenCalled();
            expect(
                notificationService.toMessageProperties
            ).toHaveBeenCalledWith(stored.title, stored.metadata);
            expect(
                notificationService.toRejectReasonProperties
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

        it('translates the title and body with the date the service formats', async () => {
            const stored: Notification = {
                id: 'notification-id',
                userId: 'user-id',
                type: EnumNotificationType.securityAlert,
                priority: EnumNotificationPriority.critical,
                title: 'notification.notify.newDeviceLogin.title',
                body: 'notification.notify.newDeviceLogin.body',
                metadata: {
                    username: 'ana',
                    loginAt: '2026-03-01T00:05:00.000Z',
                },
                isRead: false,
                readAt: null,
                createdAt: new Date('2024-01-01T00:00:00.000Z'),
                createdBy: null,
                updatedAt: new Date('2024-01-01T00:00:00.000Z'),
                updatedBy: null,
            };
            const properties = {
                username: 'ana',
                loginAt: 'Sun, 01 Mar 2026 00:05:00 +0000',
            };
            notificationService.getListCursor.mockResolvedValue({
                ...cursorPage,
                data: [stored],
            });
            notificationService.toMessageProperties.mockReturnValue(properties);
            notificationService.toRejectReasonProperties.mockReturnValue(
                properties
            );
            messageService.setMessage.mockImplementation(
                (path: string) => path
            );

            await useCase.execute(requestContext, authContext, query);

            expect(
                notificationService.toMessageProperties
            ).toHaveBeenCalledWith(stored.title, stored.metadata);
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.notify.newDeviceLogin.body',
                { customLanguage: 'en', properties }
            );
        });
    });
});
