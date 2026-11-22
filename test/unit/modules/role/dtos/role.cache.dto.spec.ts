import { RoleCacheSchema } from '@modules/role/dtos/role.cache.dto';

describe('RoleCacheSchema', () => {
    const payload = {
        id: 'id-1',
        name: 'name-1',
        description: 'description-1',
        type: 'superAdmin',
        isImmutable: true,
        createdAt: '2026-01-02T03:04:05.000Z',
        createdBy: 'createdBy-1',
        updatedAt: '2026-01-02T03:04:05.000Z',
        updatedBy: 'updatedBy-1',
        policies: [
            {
                id: 'id-1',
                roleId: 'roleId-1',
                subject: 'all',
                action: ['manage'],
                createdAt: '2026-01-02T03:04:05.000Z',
                createdBy: 'createdBy-1',
                updatedAt: '2026-01-02T03:04:05.000Z',
                updatedBy: 'updatedBy-1',
            },
        ],
        undeclared: 'extra',
    };
    const expected = {
        id: 'id-1',
        name: 'name-1',
        description: 'description-1',
        type: 'superAdmin',
        isImmutable: true,
        createdAt: new Date('2026-01-02T03:04:05.000Z'),
        createdBy: 'createdBy-1',
        updatedAt: new Date('2026-01-02T03:04:05.000Z'),
        updatedBy: 'updatedBy-1',
        policies: [
            {
                id: 'id-1',
                roleId: 'roleId-1',
                subject: 'all',
                action: ['manage'],
                createdAt: new Date('2026-01-02T03:04:05.000Z'),
                createdBy: 'createdBy-1',
                updatedAt: new Date('2026-01-02T03:04:05.000Z'),
                updatedBy: 'updatedBy-1',
            },
        ],
    };
    const invalid = {
        id: 123,
        name: 'name-1',
        description: 'description-1',
        type: 'superAdmin',
        isImmutable: true,
        createdAt: '2026-01-02T03:04:05.000Z',
        createdBy: 'createdBy-1',
        updatedAt: '2026-01-02T03:04:05.000Z',
        updatedBy: 'updatedBy-1',
        policies: [
            {
                id: 'id-1',
                roleId: 'roleId-1',
                subject: 'all',
                action: ['manage'],
                createdAt: '2026-01-02T03:04:05.000Z',
                createdBy: 'createdBy-1',
                updatedAt: '2026-01-02T03:04:05.000Z',
                updatedBy: 'updatedBy-1',
            },
        ],
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = RoleCacheSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with id of the wrong type', () => {
        const result = RoleCacheSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['id'],
                code: 'invalid_type',
            }),
        ]);
    });
});
