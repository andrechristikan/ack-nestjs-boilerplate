import { describe, expect, it } from 'vitest';

import { EnumApiKeyType, type ApiKey } from '@generated/prisma-client';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';

describe('ApiKeyUtil', () => {
    const util = new ApiKeyUtil();
    const now = new Date('2026-01-01T00:00:00.000Z');

    it.each([
        ['inactive', false, new Date('2025-01-01'), new Date('2027-01-01')],
        ['not started', true, new Date('2026-02-01'), new Date('2027-01-01')],
        ['expired', true, new Date('2025-01-01'), new Date('2025-12-31')],
    ])('rejects an %s key', (_case, isActive, startAt, endAt) => {
        expect(util.isValid({ isActive, startAt, endAt }, now)).toBe(false);
    });

    it('accepts an active key inside its validity window', () => {
        expect(
            util.isValid(
                {
                    isActive: true,
                    startAt: new Date('2025-01-01'),
                    endAt: new Date('2027-01-01'),
                },
                now
            )
        ).toBe(true);
    });

    it('maps activity metadata without the key or stored hash', () => {
        const apiKey = {
            id: 'api-key-id',
            type: EnumApiKeyType.system,
            name: 'System',
            key: 'production_key',
            hash: 'stored-hash',
            isActive: true,
            startAt: null,
            endAt: null,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
        } satisfies ApiKey;

        expect(util.mapActivityLogMetadata(apiKey)).toEqual({
            apiKeyId: 'api-key-id',
            apiKeyName: 'System',
            apiKeyType: EnumApiKeyType.system,
            timestamp: now,
        });
    });
});
