import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type {
    Notification,
    NotificationUserSetting,
    Prisma,
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
import { EnumNotificationStatusCodeError } from '@modules/notification/enums/notification.status-code.enum';
import { NotificationAlreadyReadException } from '@modules/notification/exceptions/notification.already-read.exception';
import { NotificationInvalidChannelException } from '@modules/notification/exceptions/notification.invalid-channel.exception';
import { NotificationInvalidTypeException } from '@modules/notification/exceptions/notification.invalid-type.exception';
import { NotificationNotFoundException } from '@modules/notification/exceptions/notification.not-found.exception';
import { NotificationSettingInvalidException } from '@modules/notification/exceptions/notification.setting-invalid.exception';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUserSettingRepository } from '@modules/notification/repositories/notification.user-setting.repository';
import { UserDomain } from '@modules/user/domains/user.domain';
import { MessageService } from '@common/message/services/message.service';

describe('NotificationDomain', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const notificationUserSettingRepository: MockProxy<NotificationUserSettingRepository> =
        mock<NotificationUserSettingRepository>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    let domain: NotificationDomain;

    const notification: Notification = {
        id: 'notification-id',
        userId: 'user-id',
        type: EnumNotificationType.securityAlert,
        priority: EnumNotificationPriority.normal,
        title: 'Login',
        body: 'Login from web',
        metadata: null,
        isRead: false,
        readAt: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        createdBy: 'user-id',
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    const setting: NotificationUserSetting = {
        id: 'setting-id',
        userId: 'user-id',
        channel: EnumNotificationChannel.email,
        type: EnumNotificationType.userActivity,
        isActive: true,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        createdBy: 'user-id',
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        const module = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                NotificationDomain,
                {
                    provide: NotificationRepository,
                    useValue: notificationRepository,
                },
                {
                    provide: NotificationUserSettingRepository,
                    useValue: notificationUserSettingRepository,
                },
                { provide: UserDomain, useValue: userDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();
        domain = module.get(NotificationDomain);
    });

    describe('getListCursor', () => {
        it('returns the paginated notification list from the repository', async () => {
            const pagination: IPaginationQueryCursorParams<Prisma.NotificationWhereInput> =
                {
                    limit: 20,
                    orderBy: [],
                };
            const paginationResult = {
                type: EnumPaginationType.cursor as const,
                perPage: 20,
                hasNext: false,
                data: [notification],
                cursor: 'next-cursor',
            };
            notificationUserSettingRepository.findUserSetting.mockResolvedValue(
                []
            );
            notificationRepository.findWithPaginationCursor.mockResolvedValue(
                paginationResult
            );

            const result = await domain.getListCursor('user-id', pagination);

            expect(result).toBe(paginationResult);
            expect(
                notificationRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith('user-id', pagination, []);
        });

        it('passes the types the user disabled for inApp so the repository excludes them', async () => {
            const pagination: IPaginationQueryCursorParams<Prisma.NotificationWhereInput> =
                {
                    limit: 20,
                    orderBy: [],
                };
            const settings: NotificationUserSetting[] = [
                {
                    ...setting,
                    channel: EnumNotificationChannel.inApp,
                    type: EnumNotificationType.userActivity,
                    isActive: false,
                },
                {
                    ...setting,
                    channel: EnumNotificationChannel.inApp,
                    type: EnumNotificationType.marketing,
                    isActive: true,
                },
                {
                    ...setting,
                    channel: EnumNotificationChannel.email,
                    type: EnumNotificationType.marketing,
                    isActive: false,
                },
            ];
            notificationUserSettingRepository.findUserSetting.mockResolvedValue(
                settings
            );
            notificationRepository.findWithPaginationCursor.mockResolvedValue({
                type: EnumPaginationType.cursor as const,
                perPage: 20,
                hasNext: false,
                data: [],
            });

            await domain.getListCursor('user-id', pagination);

            expect(
                notificationUserSettingRepository.findUserSetting
            ).toHaveBeenCalledWith('user-id');
            expect(
                notificationRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith('user-id', pagination, [
                EnumNotificationType.userActivity,
            ]);
        });
    });

    describe('getListUserSetting', () => {
        it('returns the stored user settings from the repository', async () => {
            const settings: NotificationUserSetting[] = [
                {
                    id: 'setting-id',
                    userId: 'user-id',
                    channel: EnumNotificationChannel.email,
                    type: EnumNotificationType.userActivity,
                    isActive: true,
                    createdAt: new Date('2024-01-01T00:00:00.000Z'),
                    createdBy: 'user-id',
                    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
                    updatedBy: null,
                },
            ];
            notificationUserSettingRepository.findUserSetting.mockResolvedValue(
                settings
            );

            const result = await domain.getListUserSetting('user-id');

            expect(result).toBe(settings);
            expect(
                notificationUserSettingRepository.findUserSetting
            ).toHaveBeenCalledWith('user-id');
        });
    });

    describe('markAsRead', () => {
        it('marks the notification with one guarded write and re-reads nothing on success', async () => {
            notificationRepository.markAsRead.mockResolvedValue(true);

            await domain.markAsRead('user-id', 'notification-id');

            expect(notificationRepository.markAsRead).toHaveBeenCalledWith(
                'notification-id',
                'user-id'
            );
            expect(
                notificationRepository.findIsReadById
            ).not.toHaveBeenCalled();
        });

        it('throws NotificationNotFoundException when the guarded write misses and the notification does not exist', async () => {
            notificationRepository.markAsRead.mockResolvedValue(false);
            notificationRepository.findIsReadById.mockResolvedValue(null);

            await expect(
                domain.markAsRead('user-id', 'notification-id')
            ).rejects.toMatchObject({
                constructor: NotificationNotFoundException,
                module: 'notification',
                statusCode: EnumNotificationStatusCodeError.notFound,
                statusCodeKey:
                    EnumNotificationStatusCodeError[
                        EnumNotificationStatusCodeError.notFound
                    ],
                messagePath: 'notification.error.notFound',
            });
            expect(notificationRepository.findIsReadById).toHaveBeenCalledWith(
                'user-id',
                'notification-id'
            );
        });

        it('throws NotificationAlreadyReadException when the guarded write misses and the notification exists', async () => {
            notificationRepository.markAsRead.mockResolvedValue(false);
            notificationRepository.findIsReadById.mockResolvedValue({
                isRead: true,
            });

            await expect(
                domain.markAsRead('user-id', 'notification-id')
            ).rejects.toMatchObject({
                constructor: NotificationAlreadyReadException,
                module: 'notification',
                statusCode: EnumNotificationStatusCodeError.alreadyRead,
                statusCodeKey:
                    EnumNotificationStatusCodeError[
                        EnumNotificationStatusCodeError.alreadyRead
                    ],
                messagePath: 'notification.error.alreadyRead',
            });
        });
    });

    describe('markAllAsRead', () => {
        it('returns the count of notifications updated by the repository', async () => {
            notificationRepository.markAllAsRead.mockResolvedValue({
                count: 3,
            });

            const result = await domain.markAllAsRead('user-id');

            expect(result).toBe(3);
            expect(notificationRepository.markAllAsRead).toHaveBeenCalledWith(
                'user-id'
            );
        });
    });

    describe('updateUserSetting', () => {
        const data = {
            channel: EnumNotificationChannel.email,
            type: EnumNotificationType.userActivity,
            isActive: false,
        };

        it('throws NotificationInvalidTypeException before writing when the type is not configurable', async () => {
            await expect(
                domain.updateUserSetting('user-id', {
                    ...data,
                    type: EnumNotificationType.securityAlert,
                })
            ).rejects.toMatchObject({
                constructor: NotificationInvalidTypeException,
                module: 'notification',
                statusCode: EnumNotificationStatusCodeError.invalidType,
                statusCodeKey:
                    EnumNotificationStatusCodeError[
                        EnumNotificationStatusCodeError.invalidType
                    ],
                messagePath: 'notification.error.invalidType',
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws NotificationInvalidChannelException before writing when the channel is not allowed for the type', async () => {
            await expect(
                domain.updateUserSetting('user-id', {
                    ...data,
                    type: EnumNotificationType.marketing,
                    channel: EnumNotificationChannel.inApp,
                })
            ).rejects.toMatchObject({
                constructor: NotificationInvalidChannelException,
                module: 'notification',
                statusCode: EnumNotificationStatusCodeError.invalidChannel,
                statusCodeKey:
                    EnumNotificationStatusCodeError[
                        EnumNotificationStatusCodeError.invalidChannel
                    ],
                messagePath: 'notification.error.invalidChannel',
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('writes the setting inside a transaction, touches the user, and stages the activity log', async () => {
            const stagedActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.userUpdateNotificationSetting,
                metadata: {},
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare.mockReturnValue(stagedActivityLog);
            const tx = {} as IDatabaseTransactionClient;
            databaseService.withTransaction.mockImplementation(async fn =>
                fn(tx)
            );
            notificationUserSettingRepository.updateUserSettingInTx.mockResolvedValue(
                true
            );

            await domain.updateUserSetting('user-id', data);

            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userUpdateNotificationSetting,
                metadata: {
                    channel: data.channel,
                    type: data.type,
                    isActive: data.isActive,
                },
            });
            expect(
                notificationUserSettingRepository.updateUserSettingInTx
            ).toHaveBeenCalledWith(tx, 'user-id', data);
            expect(userDomain.touchUpdatedByInTx).toHaveBeenCalledWith(
                tx,
                'user-id'
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });

        it('throws NotificationSettingInvalidException and touches nothing when the setting row does not exist', async () => {
            const tx = {} as IDatabaseTransactionClient;
            databaseService.withTransaction.mockImplementation(async fn =>
                fn(tx)
            );
            notificationUserSettingRepository.updateUserSettingInTx.mockResolvedValue(
                false
            );

            await expect(
                domain.updateUserSetting('user-id', data)
            ).rejects.toMatchObject({
                constructor: NotificationSettingInvalidException,
                module: 'notification',
                statusCode: EnumNotificationStatusCodeError.settingInvalid,
                statusCodeKey:
                    EnumNotificationStatusCodeError[
                        EnumNotificationStatusCodeError.settingInvalid
                    ],
                messagePath: 'notification.error.settingInvalid',
            });
            expect(userDomain.touchUpdatedByInTx).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('throws NotificationSettingInvalidException when the transaction loses a write conflict', async () => {
            const conflict = new Error('conflict');
            databaseService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                domain.updateUserSetting('user-id', data)
            ).rejects.toMatchObject({
                constructor: NotificationSettingInvalidException,
                messagePath: 'notification.error.settingInvalid',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('wraps any other transaction failure in AppUnknownException', async () => {
            const failure = new Error('down');
            databaseService.withTransaction.mockRejectedValue(failure);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                domain.updateUserSetting('user-id', data)
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: failure,
            });
        });
    });

    describe('createDefaultsInTx', () => {
        it('creates the default settings for the user inside the transaction', async () => {
            const tx = {} as IDatabaseTransactionClient;

            await domain.createDefaultsInTx(tx, 'user-id');

            expect(
                notificationUserSettingRepository.createDefaultsInTx
            ).toHaveBeenCalledWith(tx, 'user-id');
        });
    });

    describe('validateUserSetting', () => {
        it('does not throw when the type and channel combination is allowed', () => {
            expect(() =>
                domain.validateUserSetting(
                    EnumNotificationType.userActivity,
                    EnumNotificationChannel.email
                )
            ).not.toThrow();
        });

        it('throws NotificationInvalidTypeException when the type is not in the contract', () => {
            let captured: unknown;
            try {
                domain.validateUserSetting(
                    EnumNotificationType.securityAlert,
                    EnumNotificationChannel.email
                );
            } catch (err: unknown) {
                captured = err;
            }

            expect(captured).toMatchObject({
                constructor: NotificationInvalidTypeException,
                module: 'notification',
                statusCode: EnumNotificationStatusCodeError.invalidType,
                statusCodeKey:
                    EnumNotificationStatusCodeError[
                        EnumNotificationStatusCodeError.invalidType
                    ],
                messagePath: 'notification.error.invalidType',
            });
        });

        it('throws NotificationInvalidChannelException when the channel is not allowed for the type', () => {
            let captured: unknown;
            try {
                domain.validateUserSetting(
                    EnumNotificationType.marketing,
                    EnumNotificationChannel.inApp
                );
            } catch (err: unknown) {
                captured = err;
            }

            expect(captured).toMatchObject({
                constructor: NotificationInvalidChannelException,
                module: 'notification',
                statusCode: EnumNotificationStatusCodeError.invalidChannel,
                statusCodeKey:
                    EnumNotificationStatusCodeError[
                        EnumNotificationStatusCodeError.invalidChannel
                    ],
                messagePath: 'notification.error.invalidChannel',
            });
        });
    });
});
