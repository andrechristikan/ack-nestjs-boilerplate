import {
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import type { INotificationSettingContract } from '@modules/notification/interfaces/notification.interface';

/**
 * Channels a user is allowed to toggle per notification type. Types not listed are not user-configurable.
 * @public
 */
export const NotificationSettingContract: INotificationSettingContract[] = [
    {
        type: EnumNotificationType.userActivity,
        channels: [
            EnumNotificationChannel.email,
            EnumNotificationChannel.inApp,
            EnumNotificationChannel.push,
        ],
    },
    {
        type: EnumNotificationType.marketing,
        channels: [EnumNotificationChannel.email, EnumNotificationChannel.push],
    },
];
