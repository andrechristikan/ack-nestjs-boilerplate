import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type {
    Notification,
    NotificationUserSetting,
    Prisma,
} from '@generated/prisma-client/client';
import {
    EnumNotificationChannel,
    EnumNotificationPriority,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import { DeviceService } from '@modules/device/services/device.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { EnumNotificationStatusCodeError } from '@modules/notification/enums/notification.status-code.enum';
import { NotificationAlreadyReadException } from '@modules/notification/exceptions/notification.already-read.exception';
import { NotificationInvalidChannelException } from '@modules/notification/exceptions/notification.invalid-channel.exception';
import { NotificationInvalidTypeException } from '@modules/notification/exceptions/notification.invalid-type.exception';
import { NotificationNotFoundException } from '@modules/notification/exceptions/notification.not-found.exception';
import { NotificationSettingInvalidException } from '@modules/notification/exceptions/notification.setting-invalid.exception';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUserSettingRepository } from '@modules/notification/repositories/notification.user-setting.repository';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import type { IUserRecipient } from '@modules/user/interfaces/user.interface';
import { MessageService } from '@common/message/services/message.service';

describe('NotificationService', () => {
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const notificationUserSettingRepository: MockProxy<NotificationUserSettingRepository> =
        mock<NotificationUserSettingRepository>();
    const notificationUtil: MockProxy<NotificationUtil> =
        mock<NotificationUtil>();
    let service: NotificationService;

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
                { provide: DeviceService, useValue: deviceService },
                { provide: MessageService, useValue: messageService },
                NotificationService,
                {
                    provide: NotificationRepository,
                    useValue: notificationRepository,
                },
                {
                    provide: NotificationUserSettingRepository,
                    useValue: notificationUserSettingRepository,
                },
                { provide: NotificationUtil, useValue: notificationUtil },
            ],
        }).compile();
        service = module.get(NotificationService);
    });

    describe('getListCursor', () => {
        it('returns the paginated notification list from the repository', async () => {
            const pagination: IPaginationQueryCursorParams<Prisma.NotificationWhereInput> =
                {
                    fingerprint: 'aaaaaaaaaaaaaaaa',
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
            notificationUtil.listMutedInAppTypes.mockReturnValue([]);
            notificationRepository.findWithPaginationCursor.mockResolvedValue(
                paginationResult
            );

            const result = await service.getListCursor('user-id', pagination);

            expect(result).toBe(paginationResult);
            expect(
                notificationRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith('user-id', pagination, []);
        });

        it('passes the types the user disabled for inApp so the repository excludes them', async () => {
            const pagination: IPaginationQueryCursorParams<Prisma.NotificationWhereInput> =
                {
                    fingerprint: 'aaaaaaaaaaaaaaaa',
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
            notificationUtil.listMutedInAppTypes.mockReturnValue([
                EnumNotificationType.userActivity,
            ]);
            notificationRepository.findWithPaginationCursor.mockResolvedValue({
                type: EnumPaginationType.cursor as const,
                perPage: 20,
                hasNext: false,
                data: [],
            });

            await service.getListCursor('user-id', pagination);

            expect(notificationUtil.listMutedInAppTypes).toHaveBeenCalledWith(
                settings
            );
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
        it('returns the stored user settings filtered to the configurable pairs', async () => {
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

            const configurable = [settings[0]!];
            notificationUtil.listConfigurableSettings.mockReturnValue(
                configurable
            );

            const result = await service.getListUserSetting('user-id');

            expect(result).toBe(configurable);
            expect(
                notificationUtil.listConfigurableSettings
            ).toHaveBeenCalledWith(settings);
            expect(
                notificationUserSettingRepository.findUserSetting
            ).toHaveBeenCalledWith('user-id');
        });
    });

    describe('getRecipient', () => {
        it('returns the recipient mapped from the live tokens and configurable settings', async () => {
            const user: IUserRecipient = {
                id: 'user-id',
                email: 'user@example.com',
                username: 'user',
            };
            const recipient: INotificationRecipient = {
                userId: 'user-id',
                email: 'user@example.com',
                username: 'user',
                notificationTokens: ['token-1'],
                channels: [EnumNotificationChannel.email],
            };
            const configurable = [setting];
            deviceService.getNotificationTokens.mockResolvedValue(['token-1']);
            notificationUserSettingRepository.findUserSetting.mockResolvedValue(
                [setting]
            );
            notificationUtil.listConfigurableSettings.mockReturnValue(
                configurable
            );
            notificationUtil.mapRecipient.mockReturnValue(recipient);

            const result = await service.getRecipient(
                user,
                EnumNotificationKind.verificationEmail
            );

            expect(result).toBe(recipient);
            expect(deviceService.getNotificationTokens).toHaveBeenCalledWith(
                'user-id'
            );
            expect(
                notificationUserSettingRepository.findUserSetting
            ).toHaveBeenCalledWith('user-id');
            expect(
                notificationUtil.listConfigurableSettings
            ).toHaveBeenCalledWith([setting]);
            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                user,
                EnumNotificationKind.verificationEmail,
                ['token-1'],
                configurable
            );
        });
    });

    describe('markAsRead', () => {
        it('reads the row first, then marks it with one guarded write', async () => {
            notificationRepository.findIsReadById.mockResolvedValue({
                isRead: false,
            });
            notificationRepository.markAsRead.mockResolvedValue(true);

            await service.markAsRead('user-id', 'notification-id');

            expect(notificationRepository.findIsReadById).toHaveBeenCalledWith(
                'user-id',
                'notification-id'
            );
            expect(notificationRepository.markAsRead).toHaveBeenCalledWith(
                'notification-id',
                'user-id'
            );
        });

        it('throws NotificationNotFoundException when the notification does not exist and never writes', async () => {
            notificationRepository.findIsReadById.mockResolvedValue(null);

            await expect(
                service.markAsRead('user-id', 'notification-id')
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
            expect(notificationRepository.markAsRead).not.toHaveBeenCalled();
        });

        it('throws NotificationAlreadyReadException when the row is already read and never writes', async () => {
            notificationRepository.findIsReadById.mockResolvedValue({
                isRead: true,
            });

            await expect(
                service.markAsRead('user-id', 'notification-id')
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
            expect(notificationRepository.markAsRead).not.toHaveBeenCalled();
        });

        it('throws NotificationAlreadyReadException when the guarded write misses after the read', async () => {
            notificationRepository.findIsReadById.mockResolvedValue({
                isRead: false,
            });
            notificationRepository.markAsRead.mockResolvedValue(false);

            await expect(
                service.markAsRead('user-id', 'notification-id')
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
        it('passes the muted in-app types to the repository and returns the count', async () => {
            const settings = [
                {
                    id: 'setting-id',
                    userId: 'user-id',
                    channel: EnumNotificationChannel.inApp,
                    type: EnumNotificationType.userActivity,
                    isActive: false,
                    createdAt: new Date('2024-01-01T00:00:00.000Z'),
                    createdBy: 'user-id',
                    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
                    updatedBy: null,
                },
            ];
            notificationUserSettingRepository.findUserSetting.mockResolvedValue(
                settings
            );
            notificationUtil.listMutedInAppTypes.mockReturnValue([
                EnumNotificationType.userActivity,
            ]);
            notificationRepository.markAllAsRead.mockResolvedValue({
                count: 3,
            });

            const result = await service.markAllAsRead('user-id');

            expect(result).toBe(3);
            expect(
                notificationUserSettingRepository.findUserSetting
            ).toHaveBeenCalledWith('user-id');
            expect(notificationUtil.listMutedInAppTypes).toHaveBeenCalledWith(
                settings
            );
            expect(notificationRepository.markAllAsRead).toHaveBeenCalledWith(
                'user-id',
                [EnumNotificationType.userActivity]
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
                service.updateUserSetting('user-id', {
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
            expect(
                notificationUserSettingRepository.updateUserSetting
            ).not.toHaveBeenCalled();
        });

        it('throws NotificationInvalidChannelException before writing when the channel is not allowed for the type', async () => {
            await expect(
                service.updateUserSetting('user-id', {
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
            expect(
                notificationUserSettingRepository.updateUserSetting
            ).not.toHaveBeenCalled();
        });

        it('writes the setting', async () => {
            notificationUserSettingRepository.updateUserSetting.mockResolvedValue(
                true
            );

            await service.updateUserSetting('user-id', data);

            expect(
                notificationUserSettingRepository.updateUserSetting
            ).toHaveBeenCalledWith('user-id', data);
        });

        it('throws NotificationSettingInvalidException when the setting row does not exist', async () => {
            notificationUserSettingRepository.updateUserSetting.mockResolvedValue(
                false
            );

            await expect(
                service.updateUserSetting('user-id', data)
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
        });
    });

    describe('createDefaultsManyInTx', () => {
        const tx = {} as IDatabaseTransactionClient;

        it('creates the default settings of every user in one repository statement', async () => {
            await service.createDefaultsManyInTx(tx, ['user-one', 'user-two']);

            expect(
                notificationUserSettingRepository.createDefaultsManyInTx
            ).toHaveBeenCalledTimes(1);
            expect(
                notificationUserSettingRepository.createDefaultsManyInTx
            ).toHaveBeenCalledWith(tx, ['user-one', 'user-two']);
        });

        it('issues no statement for an empty list', async () => {
            await service.createDefaultsManyInTx(tx, []);

            expect(
                notificationUserSettingRepository.createDefaultsManyInTx
            ).not.toHaveBeenCalled();
        });
    });

    describe('validateUserSetting', () => {
        it('does not throw when the type and channel combination is allowed', () => {
            expect(() =>
                service.validateUserSetting(
                    EnumNotificationType.userActivity,
                    EnumNotificationChannel.email
                )
            ).not.toThrow();
        });

        it('throws NotificationInvalidTypeException when the type is not in the contract', () => {
            let captured: unknown;
            try {
                service.validateUserSetting(
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
                service.validateUserSetting(
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
