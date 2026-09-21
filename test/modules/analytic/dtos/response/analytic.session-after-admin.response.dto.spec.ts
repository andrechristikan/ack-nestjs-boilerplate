import { AnalyticSessionAfterAdminResponseSchema } from '@modules/analytic/dtos/response/analytic.session-after-admin.response.dto';

describe('AnalyticSessionAfterAdminResponseSchema', () => {
    const revokedAt = new Date('2026-01-02T03:04:05.000Z');
    const loginAt = new Date('2026-01-02T04:04:05.000Z');

    const row = {
        userId: 'user-1',
        revokedAt,
        loginAt,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticSessionAfterAdminResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('rejects a loginAt that is not a Date', () => {
        expect(() =>
            AnalyticSessionAfterAdminResponseSchema.parse({
                ...row,
                loginAt: loginAt.toISOString(),
            })
        ).toThrow();
    });

    it('strips an undeclared key', () => {
        const result = AnalyticSessionAfterAdminResponseSchema.parse({
            ...row,
            sessionId: 'session-1',
        });

        expect(result).toEqual(row);
    });
});
