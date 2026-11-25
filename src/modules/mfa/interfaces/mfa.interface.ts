import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import type {
    EnumMfaChallengePurpose,
    EnumMfaPasskeyDeviceType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserReauthenticationAction,
    Mfa,
    MfaChallengeDevice,
    MfaPasskey,
    MfaTotp,
    Prisma,
} from '@generated/prisma-client/client';
import type { MfaPasskeyRefSelect } from '@modules/mfa/constants/mfa.constant';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import type { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';

export interface IMfaCreate {
    userId: string;
    createdBy: string;
}

export interface IMfaFactorState {
    mfa: Mfa | null;
    totp: MfaTotp | null;
    passkeys: MfaPasskey[];
}

export interface IMfaVerifyInput {
    method: EnumMfaMethod | null;
    code: string | null;
    backupCode: string | null;
    passkeyResponse: AuthenticationResponseJSON | null;
}

export interface IMfaReauthenticationInput {
    action: EnumUserReauthenticationAction;
    method: EnumMfaMethod | null;
    code: string | null;
    backupCode: string | null;
    passkeyChallengeToken: string | null;
    passkeyResponse: AuthenticationResponseJSON | null;
}

export interface IMfaPasskeyCheck {
    id: string;
    counter: number;
}

export interface IMfaCheck {
    method: EnumMfaMethod;
    totpStep: number | null;
    backupCodeHash: string | null;
    passkey: IMfaPasskeyCheck | null;
}

export interface IMfaAttemptFailure {
    method: EnumMfaMethod;
    maxAttempts: number;
    lockedUntil: Date;
}

interface IMfaCheckMatched {
    check: IMfaCheck;
    failure: null;
}

interface IMfaCheckMismatched {
    check: null;
    failure: IMfaAttemptFailure;
}

export type IMfaCheckResult = IMfaCheckMatched | IMfaCheckMismatched;

export interface IMfaReauthenticationResult {
    isEnabled: boolean;
    check: IMfaCheck | null;
    failure: IMfaAttemptFailure | null;
    passkeyChallengeToken: string | null;
}

export interface IMfaTotpSetupCheck {
    totpStep: number | null;
    pendingSecret: string;
}

interface IMfaTotpSetupMatched {
    totpStep: number;
    pendingSecret: string;
    failure: null;
}

interface IMfaTotpSetupMismatched {
    totpStep: null;
    pendingSecret: null;
    failure: IMfaAttemptFailure;
}

export type IMfaTotpSetupCheckResult =
    IMfaTotpSetupMatched | IMfaTotpSetupMismatched;

export interface IMfaTotpStatus {
    isEnabled: boolean;
    isPendingConfirmation: boolean;
    confirmedAt: Date | null;
    lastUsedAt: Date | null;
}

export interface IMfaPasskey {
    id: string;
    name: string;
    deviceType: EnumMfaPasskeyDeviceType;
    backedUp: boolean;
    createdAt: Date;
    lastUsedAt: Date | null;
}

export type IMfaPasskeyCredential = Prisma.MfaPasskeyGetPayload<{
    select: typeof MfaPasskeyRefSelect;
}>;

export interface IMfaPasskeyRegistration {
    credentialId: string;
    publicKey: string;
    counter: number;
    transports: string[];
    deviceType: EnumMfaPasskeyDeviceType;
    backedUp: boolean;
}

export interface IMfaPasskeyCreate {
    userId: string;
    credentialId: string;
    publicKey: string;
    counter: number;
    transports: string[];
    deviceType: EnumMfaPasskeyDeviceType;
    backedUp: boolean;
    name: string;
}

export interface IMfaStatus {
    isEnabled: boolean;
    backupCodesRemaining: number;
    totp: IMfaTotpStatus;
    passkeys: IMfaPasskey[];
}

export interface IMfaTotpSetup {
    secret: string;
    otpauthUrl: string;
}

export interface IMfaBackupCodes {
    codes: string[];
    hashes: string[];
}

export interface IMfaChallengeCreate {
    purpose: EnumMfaChallengePurpose;
    userId: string | null;
    device: IDeviceIdentity | null;
    loginFrom: EnumUserLoginFrom | null;
    loginWith: EnumUserLoginWith | null;
    webAuthnChallenge: string | null;
}

export interface IMfaChallengeCreateData {
    purpose: EnumMfaChallengePurpose;
    userId: string | null;
    tokenHash: string;
    webAuthnChallenge: string | null;
    device: MfaChallengeDevice | null;
    loginFrom: EnumUserLoginFrom | null;
    loginWith: EnumUserLoginWith | null;
    expiredAt: Date;
}

export interface IMfaChallengePrepared {
    challengeToken: string;
    data: IMfaChallengeCreateData;
}

export interface IMfaChallengeToken {
    challengeToken: string;
    expiresInMs: number;
}

export interface IMfaChallengeLogin {
    userId: string;
    device: IDeviceIdentity;
    loginFrom: EnumUserLoginFrom;
    loginWith: EnumUserLoginWith;
    webAuthnChallenge: string | null;
}

export interface IMfaChallenge {
    userId: string | null;
    purpose: EnumMfaChallengePurpose;
    webAuthnChallenge: string | null;
    device: IDeviceIdentity | null;
    loginFrom: EnumUserLoginFrom | null;
    loginWith: EnumUserLoginWith | null;
}
