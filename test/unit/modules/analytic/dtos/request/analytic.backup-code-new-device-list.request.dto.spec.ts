import { AnalyticBackupCodeNewDeviceListRequestSchema } from '@modules/analytic/dtos/request/analytic.backup-code-new-device-list.request.dto';
import { EnumAnalyticBackupCodeNewDeviceOrderBy } from '@modules/analytic/enums/analytic.enum';

describe('AnalyticBackupCodeNewDeviceListRequestSchema', () => {
    it('parses page, perPage, and orderBy', () => {
        const result = AnalyticBackupCodeNewDeviceListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: 'latest',
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'latest',
        });
    });

    it('parses an empty object', () => {
        const result = AnalyticBackupCodeNewDeviceListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects windowMs and the date range', () => {
        expect(
            AnalyticBackupCodeNewDeviceListRequestSchema.safeParse({
                windowMs: 1000,
            }).success
        ).toBe(false);
        expect(
            AnalyticBackupCodeNewDeviceListRequestSchema.safeParse({
                startDate: '2026-01-01T00:00:00.000Z',
            }).success
        ).toBe(false);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticBackupCodeNewDeviceListRequestSchema.parse({
                page: 1,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            AnalyticBackupCodeNewDeviceListRequestSchema.safeParse({
                search: 'x',
            }).success
        ).toBe(false);
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            AnalyticBackupCodeNewDeviceListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(
            Object.values(EnumAnalyticBackupCodeNewDeviceOrderBy).join(', ')
        );
    });

    it.each(Object.values(EnumAnalyticBackupCodeNewDeviceOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                AnalyticBackupCodeNewDeviceListRequestSchema.safeParse({
                    orderBy,
                }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            AnalyticBackupCodeNewDeviceListRequestSchema.safeParse({
                orderBy: '',
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownPreset',
        'createdAt:desc',
        'latest:asc',
        'default',
        'createdAt',
        'regeneratedAt',
    ])('rejects the orderBy %s', orderBy => {
        expect(
            AnalyticBackupCodeNewDeviceListRequestSchema.safeParse({ orderBy })
                .success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            AnalyticBackupCodeNewDeviceListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).success
        ).toBe(false);
    });
});
