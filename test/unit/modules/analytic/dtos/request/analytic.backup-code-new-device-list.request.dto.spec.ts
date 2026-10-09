import { AnalyticBackupCodeNewDeviceAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticBackupCodeNewDeviceListRequestSchema } from '@modules/analytic/dtos/request/analytic.backup-code-new-device-list.request.dto';

describe('AnalyticBackupCodeNewDeviceListRequestSchema', () => {
    it('parses page, perPage, orderBy, and windowMs', () => {
        const result = AnalyticBackupCodeNewDeviceListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: `${AnalyticBackupCodeNewDeviceAvailableOrderBy[0]}:desc`,
            windowMs: 3600000,
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: `${AnalyticBackupCodeNewDeviceAvailableOrderBy[0]}:desc`,
            windowMs: 3600000,
        });
    });

    it('parses an empty object', () => {
        const result = AnalyticBackupCodeNewDeviceListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('coerces a numeric string windowMs into an integer', () => {
        const result = AnalyticBackupCodeNewDeviceListRequestSchema.parse({
            windowMs: '600000',
        });

        expect(result).toEqual({ windowMs: 600000 });
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

    it('keeps the module orderBy description', () => {
        expect(
            AnalyticBackupCodeNewDeviceListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(AnalyticBackupCodeNewDeviceAvailableOrderBy.join(', '));
    });

    it('accepts an empty orderBy so the module default order applies', () => {
        expect(
            AnalyticBackupCodeNewDeviceListRequestSchema.safeParse({
                orderBy: '',
            }).success
        ).toBe(true);
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = AnalyticBackupCodeNewDeviceAvailableOrderBy[0];
        const last =
            AnalyticBackupCodeNewDeviceAvailableOrderBy[
                AnalyticBackupCodeNewDeviceAvailableOrderBy.length - 1
            ];

        expect(
            AnalyticBackupCodeNewDeviceListRequestSchema.safeParse({
                orderBy: `${first}:asc`,
            }).success
        ).toBe(true);
        expect(
            AnalyticBackupCodeNewDeviceListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${AnalyticBackupCodeNewDeviceAvailableOrderBy[0]}:`,
        `${AnalyticBackupCodeNewDeviceAvailableOrderBy[0]}:DESC`,
        `${AnalyticBackupCodeNewDeviceAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(
            AnalyticBackupCodeNewDeviceListRequestSchema.safeParse({ orderBy })
                .success
        ).toBe(false);
    });
});
