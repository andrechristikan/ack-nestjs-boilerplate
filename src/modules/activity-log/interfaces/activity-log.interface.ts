import { ActivityLog, User } from '@prisma/client';

export interface IActivityLog extends ActivityLog {
    user: User;
}
