import { EnumNotificationType } from '@prisma/client';

export interface INotificationOutboxPayload {
    userIds: string[];
    type: EnumNotificationType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    createdBy?: string;
}
