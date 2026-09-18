import { Prisma } from '@generated/prisma-client/client';

/**
 * Route metadata key holding the API key types a handler accepts.
 * @public
 */
export const ApiKeyXTypeMetaKey = 'ApiKeyXTypeMetaKey';

/**
 * Request-store key holding the validated API key.
 * @public
 */
export const ApiKeyStoreKey = 'ApiKeyStore';

/**
 * Columns an admin api key list read returns; the credential hash is never among them.
 * @public
 */
export const ApiKeyAdminListSelect = {
    id: true,
    type: true,
    name: true,
    key: true,
    isActive: true,
    startAt: true,
    endAt: true,
    createdAt: true,
    createdBy: true,
    updatedAt: true,
    updatedBy: true,
} satisfies Prisma.ApiKeySelect;
