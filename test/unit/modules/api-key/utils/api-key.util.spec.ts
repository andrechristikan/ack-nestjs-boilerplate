import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { EnumApiKeyType } from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';

describe('ApiKeyUtil', () => {
    let util: ApiKeyUtil;

    const apiKey: ApiKey = {
        id: 'api-key-1',
        name: 'Acme Api Key',
        type: EnumApiKeyType.default,
        key: 'local_abc123',
        hash: 'hashed-secret',
        isActive: true,
        startAt: null,
        endAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedBy: 'user-1',
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [ApiKeyUtil],
        }).compile();

        util = module.get(ApiKeyUtil);
    });

    describe('mapCreate', () => {
        it('adds the plain secret to the api key row', () => {
            const result = util.mapCreate(apiKey, 'plain-secret');

            expect(result).toEqual({ ...apiKey, secret: 'plain-secret' });
        });
    });

    describe('mapActivityLogMetadata', () => {
        it('maps the api key fields and timestamp into activity log metadata', () => {
            const timestamp = new Date('2026-01-20T00:00:00.000Z');

            const result = util.mapActivityLogMetadata(
                { id: apiKey.id, name: apiKey.name, type: apiKey.type },
                timestamp
            );

            expect(result).toEqual({
                apiKeyId: apiKey.id,
                apiKeyName: apiKey.name,
                apiKeyType: apiKey.type,
                timestamp,
            });
        });
    });
});
