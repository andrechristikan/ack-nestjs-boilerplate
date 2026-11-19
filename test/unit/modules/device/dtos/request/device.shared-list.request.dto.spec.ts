import { DeviceSharedListRequestSchema } from '@modules/device/dtos/request/device.shared-list.request.dto';
import { EnumDeviceCursorOrderBy } from '@modules/device/enums/device.enum';

describe('DeviceSharedListRequestSchema', () => {
    it('parses cursor, perPage, and orderBy', () => {
        const result = DeviceSharedListRequestSchema.parse({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            orderBy: 'latest',
        });

        expect(result).toEqual({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            orderBy: 'latest',
        });
    });

    it('parses with no field set', () => {
        const result = DeviceSharedListRequestSchema.parse({});

        expect(result).toEqual({});
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

    it('keeps the preset names in the orderBy description', () => {
        expect(
            DeviceSharedListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(Object.values(EnumDeviceCursorOrderBy).join(', '));
    });

    it.each(Object.values(EnumDeviceCursorOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                DeviceSharedListRequestSchema.safeParse({ orderBy }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            DeviceSharedListRequestSchema.safeParse({ orderBy: '' }).success
        ).toBe(true);
    });

    it.each([
        'unknownPreset',
        'createdAt:desc',
        'latest:asc',
        'default',
        'createdAt',
    ])('rejects the orderBy %s', orderBy => {
        expect(
            DeviceSharedListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            DeviceSharedListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).success
        ).toBe(false);
    });
});
