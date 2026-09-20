import { createMock } from '@golevelup/ts-vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    EnumActivityLogAction,
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { NotificationAlreadyReadException } from '@modules/notification/exceptions/notification.already-read.exception';
import { NotificationInvalidChannelException } from '@modules/notification/exceptions/notification.invalid-channel.exception';
import { NotificationInvalidTypeException } from '@modules/notification/exceptions/notification.invalid-type.exception';
import { NotificationNotFoundException } from '@modules/notification/exceptions/notification.not-found.exception';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUserSettingRepository } from '@modules/notification/repositories/notification.user-setting.repository';
import { UserDomain } from '@modules/user/domains/user.domain';
import { createDatabaseServiceMock } from '@test/support/database.mock';

describe('NotificationDomain', () => {
    const notificationRepository = createMock<NotificationRepository>();
    const settingRepository = createMock<NotificationUserSettingRepository>();
    const userDomain = createMock<UserDomain>();
    const activityLogDomain = createMock<ActivityLogDomain>();
    const databaseService = createDatabaseServiceMock();

    let domain: NotificationDomain;

    beforeEach(() => {
        vi.resetAllMocks();
        domain = new NotificationDomain(
            notificationRepository,
            settingRepository,
            userDomain,
            activityLogDomain,
            databaseService
        );
    });

    it('rejects marking an unknown notification as read', async () => {
        notificationRepository.findIsReadById.mockResolvedValue(null);
        await expect(
            domain.markAsRead('user-id', 'notification-id')
        ).rejects.toBeInstanceOf(NotificationNotFoundException);
    });

    it('rejects marking an already-read notification', async () => {
        notificationRepository.findIsReadById.mockResolvedValue({
            isRead: true,
        });
        await expect(
            domain.markAsRead('user-id', 'notification-id')
        ).rejects.toBeInstanceOf(NotificationAlreadyReadException);
    });

    it('marks an unread notification as read', async () => {
        notificationRepository.findIsReadById.mockResolvedValue({
            isRead: false,
        });
        await domain.markAsRead('user-id', 'notification-id');
        expect(notificationRepository.markAsRead).toHaveBeenCalledWith(
            'user-id',
            'notification-id'
        );
    });

    it('returns the affected count when marking all as read', async () => {
        notificationRepository.markAllAsRead.mockResolvedValue({ count: 3 });
        await expect(domain.markAllAsRead('user-id')).resolves.toBe(3);
    });

    it('rejects a notification type that users cannot configure', () => {
        expect(() =>
            domain.validateUserSetting(
                EnumNotificationType.securityAlert,
                EnumNotificationChannel.email
            )
        ).toThrow(NotificationInvalidTypeException);
    });

    it('rejects a channel not allowed for the configurable type', () => {
        expect(() =>
            domain.validateUserSetting(
                EnumNotificationType.marketing,
                EnumNotificationChannel.inApp
            )
        ).toThrow(NotificationInvalidChannelException);
    });

    it('updates a valid setting and stages audit metadata', async () => {
        const data = {
            type: EnumNotificationType.userActivity,
            channel: EnumNotificationChannel.push,
            isActive: false,
        };
        await domain.updateUserSetting('user-id', data);
        expect(settingRepository.updateUserSettingInTx).toHaveBeenCalledWith(
            expect.anything(),
            'user-id',
            data
        );
        expect(userDomain.touchUpdatedByInTx).toHaveBeenCalledWith(
            expect.anything(),
            'user-id'
        );
        expect(activityLogDomain.prepare).toHaveBeenCalledWith({
            action: EnumActivityLogAction.userUpdateNotificationSetting,
            metadata: data,
        });
    });
});
