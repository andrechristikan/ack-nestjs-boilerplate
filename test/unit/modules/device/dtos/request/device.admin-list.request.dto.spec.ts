import { DeviceDefaultAvailableOrderBy } from '@modules/device/constants/device.list.constant';
import { DeviceAdminListRequestSchema } from '@modules/device/dtos/request/device.admin-list.request.dto';

describe('DeviceAdminListRequestSchema', () => {
    it('parses page, perPage, orderBy, and isRevoked', () => {
        const result = DeviceAdminListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: 'createdAt:desc',
            isRevoked: 'true',
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'createdAt:desc',
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
        expect(() =>
            DeviceAdminListRequestSchema.parse({ isRevoked: 'maybe' })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            DeviceAdminListRequestSchema.parse({ extra: true })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            DeviceAdminListRequestSchema.safeParse({ search: 'x' }).success
        ).toBe(false);
    });

    it('keeps the module orderBy description', () => {
        expect(
            DeviceAdminListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(DeviceDefaultAvailableOrderBy.join(', '));
    });
});
