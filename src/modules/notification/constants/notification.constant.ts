import { Prisma } from '@generated/prisma-client/client';
import { EnumNotificationProcessResultStatus } from '@modules/notification/enums/notification.enum';
import type { INotificationProcessResultStatusColor } from '@modules/notification/interfaces/notification.interface';

/** @public */
export const NotificationPayloadEncryptionPurpose = 'notification.payload';

/** @public */
export const NotificationRefSelect = {
    id: true,
    isRead: true,
} satisfies Prisma.NotificationSelect;

/** @public */
export const NotificationTemplateLabelWordRegex = /[A-Z]/g;

/** @public */
export const NotificationProcessResultStatusColor: INotificationProcessResultStatusColor =
    {
        [EnumNotificationProcessResultStatus.success]: '#2e7d32',
        [EnumNotificationProcessResultStatus.warning]: '#ed6c02',
        [EnumNotificationProcessResultStatus.error]: '#d32f2f',
    };
