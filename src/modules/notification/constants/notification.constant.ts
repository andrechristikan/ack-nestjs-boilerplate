import {
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client';

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
