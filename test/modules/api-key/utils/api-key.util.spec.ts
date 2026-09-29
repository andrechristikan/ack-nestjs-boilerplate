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

    describe('isExpired', () => {
        const currentDate = new Date('2026-01-15T00:00:00.000Z');

        it('returns true when the current date is after endAt', () => {
            const result = util.isExpired(
                {
                    startAt: new Date('2026-01-01T00:00:00.000Z'),
                    endAt: new Date('2026-01-10T00:00:00.000Z'),
                },
                currentDate
            );

            expect(result).toBe(true);
        });

        it('returns false when the current date is before endAt', () => {
            const result = util.isExpired(
                {
                    startAt: new Date('2026-01-01T00:00:00.000Z'),
                    endAt: new Date('2026-02-01T00:00:00.000Z'),
                },
                currentDate
            );

            expect(result).toBe(false);
        });

        it('returns false when startAt or endAt is absent', () => {
            expect(
                util.isExpired({ startAt: null, endAt: null }, currentDate)
            ).toBe(false);
            expect(
                util.isExpired(
                    {
                        startAt: new Date('2026-01-01T00:00:00.000Z'),
                        endAt: null,
                    },
                    currentDate
                )
            ).toBe(false);
        });
    });

    describe('isNotYetActive', () => {
        const currentDate = new Date('2026-01-05T00:00:00.000Z');

        it('returns true when the current date is before startAt', () => {
            const result = util.isNotYetActive(
                {
                    startAt: new Date('2026-01-10T00:00:00.000Z'),
                    endAt: new Date('2026-02-01T00:00:00.000Z'),
                },
                currentDate
            );

            expect(result).toBe(true);
        });

        it('returns false when the current date is at or after startAt', () => {
            const result = util.isNotYetActive(
                {
                    startAt: new Date('2026-01-01T00:00:00.000Z'),
                    endAt: new Date('2026-02-01T00:00:00.000Z'),
                },
                currentDate
            );

            expect(result).toBe(false);
        });

        it('returns false when startAt or endAt is absent', () => {
            expect(
                util.isNotYetActive({ startAt: null, endAt: null }, currentDate)
            ).toBe(false);
        });
    });

    describe('isActive', () => {
        it('returns the isActive flag', () => {
            expect(util.isActive({ isActive: true })).toBe(true);
            expect(util.isActive({ isActive: false })).toBe(false);
        });
    });

    describe('isValid', () => {
        const currentDate = new Date('2026-01-15T00:00:00.000Z');

        it('returns true when active, not expired, and already started', () => {
            const result = util.isValid(
                {
                    isActive: true,
                    startAt: new Date('2026-01-01T00:00:00.000Z'),
                    endAt: new Date('2026-02-01T00:00:00.000Z'),
                },
                currentDate
            );

            expect(result).toBe(true);
        });

        it('returns false when inactive', () => {
            const result = util.isValid(
                { isActive: false, startAt: null, endAt: null },
                currentDate
            );

            expect(result).toBe(false);
        });

        it('returns false when expired', () => {
            const result = util.isValid(
                {
                    isActive: true,
                    startAt: new Date('2026-01-01T00:00:00.000Z'),
                    endAt: new Date('2026-01-10T00:00:00.000Z'),
                },
                currentDate
            );

            expect(result).toBe(false);
        });

        it('returns false when not yet active', () => {
            const result = util.isValid(
                {
                    isActive: true,
                    startAt: new Date('2026-02-01T00:00:00.000Z'),
                    endAt: new Date('2026-03-01T00:00:00.000Z'),
                },
                currentDate
            );

            expect(result).toBe(false);
        });
    });

    describe('validateType', () => {
        it('returns true when the api key type is in the allow-list', () => {
            const result = util.validateType({ type: EnumApiKeyType.default }, [
                EnumApiKeyType.default,
                EnumApiKeyType.system,
            ]);

            expect(result).toBe(true);
        });

        it('returns false when the api key type is not in the allow-list', () => {
            const result = util.validateType({ type: EnumApiKeyType.system }, [
                EnumApiKeyType.default,
            ]);

            expect(result).toBe(false);
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
