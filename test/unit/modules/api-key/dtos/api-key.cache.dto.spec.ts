import { ApiKeyCacheSchema } from '@modules/api-key/dtos/api-key.cache.dto';

describe('ApiKeyCacheSchema', () => {
    const payload = {
        id: 'id-1',
        type: 'system',
        name: 'name-1',
        key: 'key-1',
        hash: 'hash-1',
        isActive: true,
        startAt: '2026-01-02T03:04:05.000Z',
        endAt: '2026-01-02T03:04:05.000Z',
        createdAt: '2026-01-02T03:04:05.000Z',
        createdBy: 'createdBy-1',
        updatedAt: '2026-01-02T03:04:05.000Z',
        updatedBy: 'updatedBy-1',
        deletedAt: '2026-01-02T03:04:05.000Z',
        deletedBy: 'deletedBy-1',
        undeclared: 'extra',
    };
    const expected = {
        id: 'id-1',
        type: 'system',
        name: 'name-1',
        key: 'key-1',
        hash: 'hash-1',
        isActive: true,
        startAt: new Date('2026-01-02T03:04:05.000Z'),
        endAt: new Date('2026-01-02T03:04:05.000Z'),
        createdAt: new Date('2026-01-02T03:04:05.000Z'),
        createdBy: 'createdBy-1',
        updatedAt: new Date('2026-01-02T03:04:05.000Z'),
        updatedBy: 'updatedBy-1',
        deletedAt: new Date('2026-01-02T03:04:05.000Z'),
        deletedBy: 'deletedBy-1',
    };
    const invalid = {
        id: 123,
        type: 'system',
        name: 'name-1',
        key: 'key-1',
        hash: 'hash-1',
        isActive: true,
        startAt: '2026-01-02T03:04:05.000Z',
        endAt: '2026-01-02T03:04:05.000Z',
        createdAt: '2026-01-02T03:04:05.000Z',
        createdBy: 'createdBy-1',
        updatedAt: '2026-01-02T03:04:05.000Z',
        updatedBy: 'updatedBy-1',
        deletedAt: null,
        deletedBy: null,
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = ApiKeyCacheSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with id of the wrong type', () => {
        const result = ApiKeyCacheSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['id'],
                code: 'invalid_type',
            }),
        ]);
    });
});
