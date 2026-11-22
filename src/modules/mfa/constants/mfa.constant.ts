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
export const MfaPasskeyCredentialSelect = {
    credentialId: true,
    transports: true,
} satisfies Prisma.MfaPasskeySelect;

/** @public */
export const MfaInclude = {
    backupCodes: { where: { usedAt: null } },
} satisfies Prisma.MfaInclude;
