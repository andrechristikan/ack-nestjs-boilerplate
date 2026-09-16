import { ActivityLog } from '@generated/prisma-client';
import { EnumActivityLogAction } from '@generated/prisma-client';
import { IUserRef } from '@modules/user/interfaces/user.interface';
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

type StageUserFields<U extends EnumActivityLogUser> =
    U extends EnumActivityLogUser.target
        ? { userId: string }
        : { userId?: never };

type StageWorkspaceFields<W extends EnumActivityLogWorkspace> =
    W extends EnumActivityLogWorkspace.target
        ? { workspaceId: string }
        : W extends EnumActivityLogWorkspace.none
          ? { workspaceId?: null }
          : { workspaceId?: never };

export type IActivityLogStageInputForContract<C extends IActivityLogContract> =
    {
        action: EnumActivityLogAction;
        metadata?: IActivityLogMetadata;
        /**
         * When true, one stage covers both success and error: the interceptor
         * flushes this event on either path. Default false = success path only.
         */
        onError?: boolean;
    } & StageUserFields<C['user']> &
        StageWorkspaceFields<C['workspace']>;

export type IActivityLogStageInput<A extends EnumActivityLogAction> = {
    action: A;
    metadata?: IActivityLogMetadata;
    onError?: boolean;
    userId?: string;
    workspaceId?: string | null;
};
