import { DeviceAdminListRequestSchema } from '@modules/device/dtos/request/device.admin-list.request.dto';
import { EnumDeviceOrderBy } from '@modules/device/enums/device.enum';

describe('DeviceAdminListRequestSchema', () => {
    it('parses page, perPage, orderBy, and isRevoked', () => {
        const result = DeviceAdminListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: 'latest',
            isRevoked: 'true',
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'latest',
            isRevoked: true,
        });
    });

    it('parses with no field set', () => {
        const result = DeviceAdminListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('coerces the isRevoked boolean string', () => {
        const result = DeviceAdminListRequestSchema.parse({
            isRevoked: 'false',
        });

        expect(result).toEqual({ isRevoked: false });
    });

    it('rejects an isRevoked value that is not exactly true or false', () => {
        const result = DeviceAdminListRequestSchema.safeParse({
            isRevoked: 'maybe',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['isRevoked'],
                code: 'invalid_value',
            }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = DeviceAdminListRequestSchema.safeParse({ extra: true });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects search', () => {
        expect(
            DeviceAdminListRequestSchema.safeParse({ search: 'x' }).error
                ?.issues
        ).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            DeviceAdminListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(Object.values(EnumDeviceOrderBy).join(', '));
    });

    it.each(Object.values(EnumDeviceOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                DeviceAdminListRequestSchema.safeParse({ orderBy }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            DeviceAdminListRequestSchema.safeParse({ orderBy: '' }).success
        ).toBe(true);
    });

    it.each([
        'unknownPreset',
        'createdAt:desc',
        'latest:asc',
        'default',
        'createdAt',
        'lastActiveAt',
    ])('rejects the orderBy %s', orderBy => {
        expect(
            DeviceAdminListRequestSchema.safeParse({ orderBy }).error?.issues
        ).toEqual([
            expect.objectContaining({
                path: ['orderBy'],
                code: 'invalid_union',
            }),
        ]);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            DeviceAdminListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).error?.issues
        ).toEqual([
            expect.objectContaining({
                path: ['orderBy'],
                code: 'invalid_union',
            }),
        ]);
    });
});
