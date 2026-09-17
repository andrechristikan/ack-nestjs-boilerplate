import {
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client/client';

/**
 * Channels a user is allowed to toggle per notification type. Types not listed are not user-configurable.
 * @public
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

/**
 * HKDF purpose that seals secrets inside queued notification jobs.
 * @public
 */
export const NotificationPayloadEncryptionPurpose = 'notification.payload';
