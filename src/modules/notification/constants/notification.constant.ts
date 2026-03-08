import {
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client';

/**
 * Defines allowed notification type and channel combinations for user preferences.
 * Restricts which delivery channels (email, push, in-app) are available for each notification type.
 * For example, marketing notifications can only be sent via email and push, not in-app.
 */
export const NotificationSettingUpdateAllowedCombinations: {
    type: EnumNotificationType;
    channels: EnumNotificationChannel[];
}[] = [
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
