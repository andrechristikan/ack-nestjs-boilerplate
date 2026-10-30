import type { User } from '@generated/prisma-client/client';
import type {
    IAuthToken,
    IAuthTwoFactorChallengeCache,
    IAuthTwoFactorVerifyResult,
} from '@modules/auth/interfaces/auth.interface';
import type { IDeviceOwnership } from '@modules/device/interfaces/device.interface';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import type {
    IUser,
    IUserCredentialAttempt,
} from '@modules/user/interfaces/user.interface';

export interface IAccountDeviceRemoveResult {
    deviceOwnership: IDeviceOwnership;
    revokedSessions: ISessionRef[];
}

export interface IAccountPasswordUpdateByAdminResult {
    user: User;
    passwordHistoryId: string;
    revoked: ISessionRef[];
}

export interface IAccountCredentialAttempt {
    attempt: IUserCredentialAttempt;
    revoked: ISessionRef[] | null;
}

export interface IAccountPasswordChangeResult {
    passwordHistoryId: string;
    revoked: ISessionRef[];
}

export interface IAccountStatusUpdateResult {
    user: User;
    revoked: ISessionRef[] | null;
}

export interface IAccountDeleteSelfResult {
    user: User;
    revoked: ISessionRef[];
}

export interface IAccountRefresh {
    tokens: IAuthToken | null;
    revoked: ISessionRef[];
}

export interface IAccountTwoFactorLogin {
    user: IUser;
    challenge: IAuthTwoFactorChallengeCache;
    verified: IAuthTwoFactorVerifyResult;
}
