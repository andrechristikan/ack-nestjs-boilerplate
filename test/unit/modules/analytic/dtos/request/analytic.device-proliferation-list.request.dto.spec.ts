import { AnalyticDeviceProliferationAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticDeviceProliferationListRequestSchema } from '@modules/analytic/dtos/request/analytic.device-proliferation-list.request.dto';

describe('AnalyticDeviceProliferationListRequestSchema', () => {
    it('parses page, perPage, and orderBy', () => {
        const result = AnalyticDeviceProliferationListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: `${AnalyticDeviceProliferationAvailableOrderBy[0]}:desc`,
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: `${AnalyticDeviceProliferationAvailableOrderBy[0]}:desc`,
        });
    });

    it('parses an orderBy array', () => {
        const result = AnalyticDeviceProliferationListRequestSchema.parse({
            orderBy: [
                `${AnalyticDeviceProliferationAvailableOrderBy[0]}:desc`,
                `${AnalyticDeviceProliferationAvailableOrderBy[1]}:asc`,
            ],
        });

        expect(result).toEqual({
            orderBy: [
                `${AnalyticDeviceProliferationAvailableOrderBy[0]}:desc`,
                `${AnalyticDeviceProliferationAvailableOrderBy[1]}:asc`,
            ],
        });
    });

    it('parses an empty object', () => {
        const result = AnalyticDeviceProliferationListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticDeviceProliferationListRequestSchema.parse({
                page: 1,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            AnalyticDeviceProliferationListRequestSchema.safeParse({
                search: 'x',
            }).success
        ).toBe(false);
    });

    it('keeps the module orderBy description', () => {
        expect(
            AnalyticDeviceProliferationListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(AnalyticDeviceProliferationAvailableOrderBy.join(', '));
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = AnalyticDeviceProliferationAvailableOrderBy[0];
        const last =
            AnalyticDeviceProliferationAvailableOrderBy[
                AnalyticDeviceProliferationAvailableOrderBy.length - 1
            ];

        expect(
            AnalyticDeviceProliferationListRequestSchema.safeParse({
                orderBy: `${first}:asc`,
            }).success
        ).toBe(true);
        expect(
            AnalyticDeviceProliferationListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${AnalyticDeviceProliferationAvailableOrderBy[0]}:`,
        `${AnalyticDeviceProliferationAvailableOrderBy[0]}:DESC`,
        `${AnalyticDeviceProliferationAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(
            AnalyticDeviceProliferationListRequestSchema.safeParse({ orderBy })
                .success
        ).toBe(false);
    });
});
