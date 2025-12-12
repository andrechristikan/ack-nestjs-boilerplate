import { ActivityLog, User } from '@prisma/client';

export interface IActivityLog extends ActivityLog {
    user: User;
}

export type IActivityLogMetadata = Record<string, string | number | Date>;
