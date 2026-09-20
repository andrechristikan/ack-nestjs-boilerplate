import { AnalyticLoginSpikeIpListRequestSchema } from '@modules/analytic/dtos/request/analytic-login-spike-ip-list.request.dto';

describe('AnalyticLoginSpikeIpListRequestSchema', () => {
    it('parses page, perPage, orderBy, and windowMs', () => {
        const result = AnalyticLoginSpikeIpListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: 'createdAt:desc',
            windowMs: 3600000,
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'createdAt:desc',
            windowMs: 3600000,
        });
    });

    it('parses an empty object', () => {
        const result = AnalyticLoginSpikeIpListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('coerces a numeric string windowMs into an integer', () => {
        const result = AnalyticLoginSpikeIpListRequestSchema.parse({
            windowMs: '600000',
        });

        expect(result).toEqual({ windowMs: 600000 });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticLoginSpikeIpListRequestSchema.parse({
                page: 1,
                extra: true,
            })
        ).toThrow();
    });
});
