import { EnumAnalyticFraudContributingSignal } from '@modules/analytic/enums/analytic.enum';
import { AnalyticAccountTakeoverResponseSchema } from '@modules/analytic/dtos/response/analytic.account-takeover.response.dto';

describe('AnalyticAccountTakeoverResponseSchema', () => {
    const passwordChangedAt = new Date('2026-01-02T03:04:05.000Z');

    const row = {
        userId: 'user-1',
        indicatorCodes: [
            EnumAnalyticFraudContributingSignal.newDeviceAfterPasswordChange,
            EnumAnalyticFraudContributingSignal.nearLockout,
        ],
        passwordChangedAt,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticAccountTakeoverResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('rejects an indicator code that is no contributing signal', () => {
        const result = AnalyticAccountTakeoverResponseSchema.safeParse({
            ...row,
            indicatorCodes: ['newDevice'],
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['indicatorCodes', 0],
                code: 'invalid_value',
            }),
        ]);
    });

    it('rejects a passwordChangedAt that is not a Date', () => {
        const result = AnalyticAccountTakeoverResponseSchema.safeParse({
            ...row,
            passwordChangedAt: passwordChangedAt.toISOString(),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['passwordChangedAt'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticAccountTakeoverResponseSchema.parse({
            ...row,
            password: 'hashed-password',
        });

        expect(result).toEqual(row);
    });
});
