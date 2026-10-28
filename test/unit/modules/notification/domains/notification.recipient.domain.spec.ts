import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumDeviceNotificationProvider,
    EnumDevicePlatform,
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import type { NotificationUserSetting } from '@generated/prisma-client/client';
import type { IUserRecipient } from '@modules/user/interfaces/user.interface';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import type { IDeviceOwnershipWithDevice } from '@modules/device/interfaces/device.interface';
import { NotificationRecipientDomain } from '@modules/notification/domains/notification.recipient.domain';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationUserSettingRepository } from '@modules/notification/repositories/notification.user-setting.repository';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { MessageService } from '@common/message/services/message.service';

describe('NotificationRecipientDomain', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const notificationUserSettingRepository: MockProxy<NotificationUserSettingRepository> =
        mock<NotificationUserSettingRepository>();
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    let domain: NotificationRecipientDomain;

    const user: IUserRecipient = {
        id: 'user-id',
        email: 'nadia@example.com',
        username: 'nadia',
    };

    const ownership: IDeviceOwnershipWithDevice = {
        id: 'ownership-id',
        deviceId: 'device-id',
        userId: user.id,
        revokedAt: null,
        isRevoked: false,
        revokedById: null,
        lastActiveAt: new Date('2024-01-01T00:00:00.000Z'),
        biometricEnabled: false,
        biometricToken: null,
        biometricType: null,
        biometricEnabledAt: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedBy: null,
        device: {
            id: 'device-id',
            fingerprint: 'fingerprint-1',
            name: 'iPhone',
            platform: EnumDevicePlatform.ios,
            lastActiveAt: new Date('2024-01-01T00:00:00.000Z'),
            notificationToken: 't1',
            notificationProvider: EnumDeviceNotificationProvider.fcm,
            createdAt: new Date('2024-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2024-01-01T00:00:00.000Z'),
            updatedBy: null,
        },
    };

    const emailDisabled: NotificationUserSetting = {
        id: 'setting-id',
        userId: user.id,
        channel: EnumNotificationChannel.email,
        type: EnumNotificationType.userActivity,
        isActive: false,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);

        const moduleRef = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                NotificationRecipientDomain,
                NotificationUtil,
                {
                    provide: NotificationUserSettingRepository,
                    useValue: notificationUserSettingRepository,
                },
                { provide: DeviceDomain, useValue: deviceDomain },
            ],
        }).compile();

        domain = moduleRef.get(NotificationRecipientDomain);
    });

    describe('getRecipient', () => {
        it('returns the identity from the argument and the distinct non-null tokens', async () => {
            notificationUserSettingRepository.findUserSetting.mockResolvedValue(
                []
            );
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                ownership,
                {
                    ...ownership,
                    device: { ...ownership.device, notificationToken: null },
                },
                ownership,
                {
                    ...ownership,
                    device: { ...ownership.device, notificationToken: 't2' },
                },
            ]);

            const result = await domain.getRecipient(
                user,
                EnumNotificationKind.workspaceInvite
            );

            expect(result).toMatchObject({
                userId: 'user-id',
                email: 'nadia@example.com',
                username: 'nadia',
                notificationTokens: ['t1', 't2'],
            });
            expect(
                notificationUserSettingRepository.findUserSetting
            ).toHaveBeenCalledWith('user-id');
            expect(
                deviceDomain.getOwnershipsWithNotificationToken
            ).toHaveBeenCalledWith('user-id');
        });

        it('drops a channel the user disabled for the kind type', async () => {
            notificationUserSettingRepository.findUserSetting.mockResolvedValue(
                [emailDisabled]
            );
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue(
                []
            );

            const result = await domain.getRecipient(
                user,
                EnumNotificationKind.workspaceInvite
            );

            expect(result.channels).not.toContain(
                EnumNotificationChannel.email
            );
            expect(result.channels).toContain(EnumNotificationChannel.push);
        });

        it('starts both reads before either resolves', async () => {
            const settings = Promise.withResolvers<NotificationUserSetting[]>();
            const ownerships =
                Promise.withResolvers<IDeviceOwnershipWithDevice[]>();
            notificationUserSettingRepository.findUserSetting.mockReturnValue(
                settings.promise
            );
            deviceDomain.getOwnershipsWithNotificationToken.mockReturnValue(
                ownerships.promise
            );

            const pending = domain.getRecipient(
                user,
                EnumNotificationKind.workspaceInvite
            );

            expect(
                notificationUserSettingRepository.findUserSetting
            ).toHaveBeenCalledTimes(1);
            expect(
                deviceDomain.getOwnershipsWithNotificationToken
            ).toHaveBeenCalledTimes(1);

            settings.resolve([]);
            ownerships.resolve([]);

            await expect(pending).resolves.toMatchObject({
                userId: 'user-id',
            });
        });
    });

    describe('buildNewUserRecipient', () => {
        it('snapshots the identity with no token and the kind channels, reading nothing', () => {
            const result = domain.buildNewUserRecipient(
                user,
                EnumNotificationKind.welcome
            );

            expect(result).toStrictEqual({
                userId: 'user-id',
                email: 'nadia@example.com',
                username: 'nadia',
                notificationTokens: [],
                channels: expect.arrayContaining([
                    EnumNotificationChannel.email,
                ]),
            });
            expect(
                notificationUserSettingRepository.findUserSetting
            ).not.toHaveBeenCalled();
            expect(
                deviceDomain.getOwnershipsWithNotificationToken
            ).not.toHaveBeenCalled();
        });
    });
});
