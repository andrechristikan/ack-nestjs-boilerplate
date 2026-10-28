import type { ActivityLog, Prisma } from '@generated/prisma-client/client';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
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

export interface IActivityLogStaged {
    action: EnumActivityLogAction;
    metadata: IActivityLogMetadata;
    userId: string | null;
    createdBy: string | null;
    workspaceId: string | null;
}

export interface IActivityLogActionContract {
    user: EnumActivityLogUser;
    workspace: EnumActivityLogWorkspace;
    metadata: z.ZodType<IActivityLogMetadata>;
}

export interface IActivityLogFlushOptions {
    payloadUserId: string | null;
}

export type IActivityLogStageInput<A extends EnumActivityLogAction> = {
    action: A;
    metadata?: IActivityLogMetadata;
    userId?: string;
    createdBy?: string;
    workspaceId?: string;
};

export interface IActivityLogCreate {
    id: string;
    userId: string;
    createdBy: string;
    workspaceId: string | null;
    action: EnumActivityLogAction;
    description: string;
    requestLog: IRequestLog;
    metadata: IActivityLogMetadata;
    createdAt: Date;
}

export interface IActivityLogCreatePayload extends Omit<
    IActivityLogCreate,
    'createdAt'
> {
    createdAt: string;
}

export interface IActivityLogCreateManyPayload {
    rows: IActivityLogCreatePayload[];
}

export interface IActivityLogAnalyticActionCount {
    action: EnumActivityLogAction;
    count: number;
}

export interface IActivityLogAnalyticList {
    id: string;
    userId: string;
    action: EnumActivityLogAction;
    ipAddress: string | null;
    createdAt: Date;
    userAgent: Prisma.JsonValue | null;
    workspaceId: string | null;
}

export type IActivityLogActionContracts = Record<
    EnumActivityLogAction,
    IActivityLogActionContract
>;
