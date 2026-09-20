import { AnalyticSessionDeviceRatioResponseSchema } from '@modules/analytic/dtos/response/analytic.session-device-ratio.response.dto';

describe('AnalyticSessionDeviceRatioResponseSchema', () => {
    const row = { sessions: 10, devices: 5, ratio: 2 };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticSessionDeviceRatioResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticSessionDeviceRatioResponseSchema.parse({
            ...row,
            jti: 'session-jti',
        });

        expect(result).toEqual(row);
    });
});
