import type { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { IActivityLogStageInput } from '@modules/activity-log/interfaces/activity-log.interface';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';

export interface IUserLoginRefresh {
    tokens: IAuthToken | null;
    revoked: ISessionRef[];
}

export interface IUserLoginSession {
    tokens: IAuthToken;
    sessionId: string;
    jti: string;
    revokeStages: IActivityLogStageInput<EnumActivityLogAction>[];
}
