import { AnalyticDeviceProliferationResponseSchema } from '@modules/analytic/dtos/response/analytic.device-proliferation.response.dto';

describe('AnalyticDeviceProliferationResponseSchema', () => {
    const row = {
        userId: 'user-1',
        deviceCount: 9,
        zScore: 3.4,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticDeviceProliferationResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticDeviceProliferationResponseSchema.parse({
            ...row,
            email: 'user@example.com',
        });

        expect(result).toEqual(row);
    });
});
