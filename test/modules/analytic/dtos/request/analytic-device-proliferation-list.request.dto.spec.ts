import { AnalyticDeviceProliferationListRequestSchema } from '@modules/analytic/dtos/request/analytic-device-proliferation-list.request.dto';

describe('AnalyticDeviceProliferationListRequestSchema', () => {
    it('parses page, perPage, and orderBy', () => {
        const result = AnalyticDeviceProliferationListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: 'createdAt:desc',
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'createdAt:desc',
        });
    });

    it('parses an orderBy array', () => {
        const result = AnalyticDeviceProliferationListRequestSchema.parse({
            orderBy: ['createdAt:desc', 'id:asc'],
        });

        expect(result).toEqual({ orderBy: ['createdAt:desc', 'id:asc'] });
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
});
