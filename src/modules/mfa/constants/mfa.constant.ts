import type { Prisma } from '@generated/prisma-client/client';

/** @public */
export const MfaChallengeEncryptionPurpose = 'mfa.challenge.notificationToken';

/** @public */
export const MfaTotpSecretEncryptionPurpose = 'mfa.totp.secret';

/** @public */
export const MfaPasskeySelect = {
    id: true,
    name: true,
    deviceType: true,
    backedUp: true,
    createdAt: true,
    lastUsedAt: true,
} satisfies Prisma.MfaPasskeySelect;

/** @public */
export const MfaPasskeyRefSelect = {
    id: true,
    credentialId: true,
    transports: true,
} satisfies Prisma.MfaPasskeySelect;

/** @public */
export const MfaRefSelect = {
    id: true,
    userId: true,
    attempt: true,
} satisfies Prisma.MfaSelect;

/** @public */
export const MfaTotpCodeRegex = /^[0-9]+$/;

/** @public */
export const MfaPasskeyBase64UrlRegex = /^[A-Za-z0-9_-]+$/;
