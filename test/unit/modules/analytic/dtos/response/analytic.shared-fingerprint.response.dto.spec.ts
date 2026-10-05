import { AnalyticSharedFingerprintResponseSchema } from '@modules/analytic/dtos/response/analytic.shared-fingerprint.response.dto';

describe('AnalyticSharedFingerprintResponseSchema', () => {
    const row = {
        fingerprint: 'fingerprint-1',
        userCount: 3,
        userIds: ['user-1', 'user-2', 'user-3'],
    };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticSharedFingerprintResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticSharedFingerprintResponseSchema.parse({
            ...row,
            deviceId: 'device-1',
        });

        expect(result).toEqual(row);
    });
});
