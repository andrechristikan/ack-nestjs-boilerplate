import { AnalyticActiveUsersResponseSchema } from '@modules/analytic/dtos/response/analytic.active-users.response.dto';

describe('AnalyticActiveUsersResponseSchema', () => {
    const row = {
        daily: 2,
        weekly: 5,
        monthly: 9,
        windowEnd: new Date('2026-11-19T10:00:00.000Z'),
        computedAt: null,
    };
    const { daily: _daily, ...withoutDaily } = row;
    const { weekly: _weekly, ...withoutWeekly } = row;
    const { monthly: _monthly, ...withoutMonthly } = row;
    const { windowEnd: _windowEnd, ...withoutWindowEnd } = row;
    const { computedAt: _computedAt, ...withoutComputedAt } = row;

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticActiveUsersResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticActiveUsersResponseSchema.parse({
            ...row,
            secret: 'x',
        });

        expect(result).toEqual(row);
    });

    it('accepts a null computedAt', () => {
        const result = AnalyticActiveUsersResponseSchema.parse(row);

        expect(result.computedAt).toBeNull();
    });

    it.each([
        ['daily', withoutDaily],
        ['weekly', withoutWeekly],
        ['monthly', withoutMonthly],
        ['windowEnd', withoutWindowEnd],
        ['computedAt', withoutComputedAt],
    ])('rejects an absent %s', (_field, payload) => {
        expect(
            AnalyticActiveUsersResponseSchema.safeParse(payload).error?.issues
        ).toEqual([
            expect.objectContaining({ path: [_field], code: 'invalid_type' }),
        ]);
    });
});
