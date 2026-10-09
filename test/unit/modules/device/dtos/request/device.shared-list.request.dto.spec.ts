import { DeviceCursorAvailableOrderBy } from '@modules/device/constants/device.list.constant';
import { DeviceSharedListRequestSchema } from '@modules/device/dtos/request/device.shared-list.request.dto';

describe('DeviceSharedListRequestSchema', () => {
    it('parses cursor, perPage, and orderBy', () => {
        const result = DeviceSharedListRequestSchema.parse({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            orderBy: 'createdAt:desc',
        });

        expect(result).toEqual({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            orderBy: 'createdAt:desc',
        });
    });

    it('parses with no field set', () => {
        const result = DeviceSharedListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('accepts an array of orderBy fields', () => {
        const result = DeviceSharedListRequestSchema.parse({
            orderBy: ['createdAt:desc', 'createdAt:asc'],
        });

        expect(result).toEqual({
            orderBy: ['createdAt:desc', 'createdAt:asc'],
        });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            DeviceSharedListRequestSchema.parse({ extra: true })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            DeviceSharedListRequestSchema.safeParse({ search: 'x' }).success
        ).toBe(false);
    });

    it('keeps the module orderBy description', () => {
        expect(
            DeviceSharedListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(DeviceCursorAvailableOrderBy.join(', '));
    });
});
