import type {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
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

export interface IActivityLogActionContract {
    user: EnumActivityLogUser;
    workspace: EnumActivityLogWorkspace;
    metadata: z.ZodType<IActivityLogMetadata>;
}

export type IActivityLogMetadataParseResult =
    z.ZodSafeParseResult<IActivityLogMetadata>;

export type IActivityLogInput<A extends EnumActivityLogAction> = {
    action: A;
    metadata?: IActivityLogMetadata;
    userId?: string;
    createdBy?: string;
    workspaceId?: string;
};

export interface IActivityLogContextPayload {
    apiKeyId: string;
    actorUserId: string | null;
    workspaceId: string | null;
    requestLog: IRequestLog;
}

export interface IActivityLogActorPayload extends IActivityLogContextPayload {
    actorUserId: string;
}

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

export interface IActivityLogIpGroup {
    ipAddress: string;
    count: number;
}

export interface IActivityLogUserGroup {
    userId: string;
    count: number;
}

export interface IActivityLogIpUserGroup {
    ipAddress: string | null;
    userId: string;
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

export interface IActivityLogCreateManyEffect extends IOutboxEffect {
    queue: EnumActivityLogQueue.activityLog;
    name: EnumActivityLogProcess.createMany;
    data: IActivityLogCreateManyPayload;
}
