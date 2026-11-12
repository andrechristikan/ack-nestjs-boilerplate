import type { Request } from 'express';
import type { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import type { IUser } from '@modules/user/interfaces/user.interface';
import type {
    GeoLocation,
    Project,
    ProjectMember,
    UserAgent,
    Workspace,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import { EnumRequestThrottleRoute } from '@common/request/enums/request.enum';

export interface IRequestApp<T = IAuthJwtAccessTokenPayload> extends Omit<
    Request,
    'user'
> {
    id: string;
    correlationId: string;
    user?: T;
}

export interface IRequestLog {
    userAgent: UserAgent;
    ipAddress: string | null;
    geoLocation: GeoLocation | null;
}

export interface IRequestContextSnapshot {
    actorUserId: string | null;
    workspaceId: string | null;
    requestLog: IRequestLog;
}

export interface IRequestContextUserSnapshot extends IRequestContextSnapshot {
    actorUserId: string;
}

export interface IRequestContextSession {
    sessionId: string;
    deviceOwnershipId: string;
}

export interface IRequestContextPublic {
    requestLog: IRequestLog;
    snapshot: IRequestContextSnapshot;
}

export interface IRequestContextUser {
    requestLog: IRequestLog;
    user: IUser;
    session: IRequestContextSession;
    snapshot: IRequestContextUserSnapshot;
}

export interface IRequestContextWorkspace extends IRequestContextUser {
    workspace: Workspace;
    workspaceMember: WorkspaceMember;
}

export interface IRequestContextProject extends IRequestContextWorkspace {
    project: Project;
}

export interface IRequestContextProjectMember extends IRequestContextProject {
    projectMember: ProjectMember;
}

export interface IRequestThrottlePolicy {
    ttlInMs: number;
    limit: number;
    blockDurationInMs: number;
}

export interface IRequestThrottleOptions {
    user?: boolean;
    route?: EnumRequestThrottleRoute;
}

export type IRequestThrottleRoutePolicies = Record<
    EnumRequestThrottleRoute,
    IRequestThrottlePolicy
>;

export type IRequestStorePatch<T extends object> = Partial<T>;
