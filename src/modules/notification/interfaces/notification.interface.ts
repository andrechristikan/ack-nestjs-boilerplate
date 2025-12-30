import { Notification, User } from '@prisma/client';

export interface INotification extends Notification {
    user?: User;
}
