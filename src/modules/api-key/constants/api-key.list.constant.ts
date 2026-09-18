import { EnumApiKeyType } from '@generated/prisma-client/client';

/**
 * Fields the admin API key list searches.
 * @public
 */
export const ApiKeyDefaultAvailableSearch = ['name'];

/**
 * Sort fields the admin API key list accepts.
 * @public
 */
export const ApiKeyDefaultAvailableOrderBy = ['createdAt', 'name'];

/**
 * API key types the admin API key list filter accepts.
 * @public
 */
export const ApiKeyDefaultType = Object.values(EnumApiKeyType);
