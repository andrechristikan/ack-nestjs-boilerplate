import {
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import type { INotificationSettingContract } from '@modules/notification/interfaces/notification.interface';

/** @public */
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
