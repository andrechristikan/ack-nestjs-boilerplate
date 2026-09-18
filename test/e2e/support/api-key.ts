import { migrationApiKeyData } from '@migration/data/migration.api-key.data';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import type request from 'supertest';
import { withApiKey } from '@test/e2e/support/request';

const seededApiKey = migrationApiKeyData[EnumAppEnvironment.test][0]!;

/**
 * The `x-api-key` header value for the seeded default-type API key (`pnpm test:e2e:db:reset`
 * seeds it). The stored key is prefixed with the app env by `ApiKeyCredentialUtil.createKey`,
 * which `MigrationApiKeySeed` applies at seed time — mirrored here rather than hardcoded twice.
 */
export const DEFAULT_API_KEY_HEADER_VALUE = `${EnumAppEnvironment.test}_${seededApiKey.key}:${seededApiKey.secret}`;

/**
 * Sets the `x-api-key` header to the seeded default-type API key.
 */
export function withDefaultApiKey(testRequest: request.Test): request.Test {
    return withApiKey(testRequest, DEFAULT_API_KEY_HEADER_VALUE);
}
