import type { ActivityLog } from '@generated/prisma-client/client';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { IUserRef } from '@modules/user/interfaces/user.interface';
import {
    EnumActivityLogUser,
    EnumActivityLogWorkspace,
} from '@modules/activity-log/enums/activity-log.enum';
import { z } from 'zod';

export interface IActivityLog extends ActivityLog {
    user: IUserRef;
}

export type IActivityLogMetadata = Record<
    string,
    string | number | boolean | Date
>;

export interface IActivityLogStagedEvent {
    action: EnumActivityLogAction;
    metadata: IActivityLogMetadata;
    onError: boolean;
    userId?: string;
    createdBy?: string;
    workspaceId?: string | null;
}

export interface IActivityLogContract {
    user: EnumActivityLogUser;
    workspace: EnumActivityLogWorkspace;
    metadata: z.ZodType<IActivityLogMetadata>;
}

export interface IActivityLogFlushOptions {
    payloadUserId: string | null;
    isError: boolean;
}

export type IActivityLogStageInput<A extends EnumActivityLogAction> = {
    action: A;
    metadata?: IActivityLogMetadata;
    onError?: boolean;
    userId?: string;
    createdBy?: string;
    workspaceId?: string | null;
};
