import { FeatureFlagCacheSchema } from '@modules/feature-flag/dtos/feature-flag.cache.dto';

describe('FeatureFlagCacheSchema', () => {
    const payload = {
        id: 'id-1',
        key: 'key-1',
        description: 'description-1',
        isEnable: true,
        rolloutPercent: 1,
        targetUserIds: ['targetUserIds-1'],
        metadata: { flag: true },
        createdAt: '2026-01-02T03:04:05.000Z',
        createdBy: 'createdBy-1',
        updatedAt: '2026-01-02T03:04:05.000Z',
        updatedBy: 'updatedBy-1',
        undeclared: 'extra',
    };
    const expected = {
        id: 'id-1',
        key: 'key-1',
        description: 'description-1',
        isEnable: true,
        rolloutPercent: 1,
        targetUserIds: ['targetUserIds-1'],
        metadata: { flag: true },
        createdAt: new Date('2026-01-02T03:04:05.000Z'),
        createdBy: 'createdBy-1',
        updatedAt: new Date('2026-01-02T03:04:05.000Z'),
        updatedBy: 'updatedBy-1',
    };
    const invalid = {
        id: 123,
        key: 'key-1',
        description: 'description-1',
        isEnable: true,
        rolloutPercent: 1,
        targetUserIds: ['targetUserIds-1'],
        metadata: { flag: true },
        createdAt: '2026-01-02T03:04:05.000Z',
        createdBy: 'createdBy-1',
        updatedAt: '2026-01-02T03:04:05.000Z',
        updatedBy: 'updatedBy-1',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = FeatureFlagCacheSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with id of the wrong type', () => {
        const result = FeatureFlagCacheSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['id'],
                code: 'invalid_type',
            }),
        ]);
    });
});
