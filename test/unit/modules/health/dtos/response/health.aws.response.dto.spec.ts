import { HealthAwsResponseSchema } from '@modules/health/dtos/response/health.aws.response.dto';
import { EnumHealthStatus } from '@modules/health/enums/health.enum';

describe('HealthAwsResponseSchema', () => {
    const payload = {
        status: EnumHealthStatus.ok,
        info: {
            s3PublicBucket: { status: 'up' },
            s3PrivateBucket: { status: 'up' },
            ses: { status: 'up' },
        },
        error: {},
        details: {
            s3PublicBucket: { status: 'up' },
            s3PrivateBucket: { status: 'up' },
            ses: { status: 'up' },
        },
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = HealthAwsResponseSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('strips an undeclared key', () => {
        const result = HealthAwsResponseSchema.parse({
            ...payload,
            extra: 'unexpected',
        });

        expect(result).toEqual(payload);
    });

    it('parses a payload with info and error omitted', () => {
        const { info: _info, error: _error, ...withoutOptional } = payload;

        const result = HealthAwsResponseSchema.parse(withoutOptional);

        expect(result).toEqual(withoutOptional);
    });

    it('rejects an invalid status value', () => {
        const result = HealthAwsResponseSchema.safeParse({
            ...payload,
            status: 'invalid',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['status'],
                code: 'invalid_value',
            }),
        ]);
    });

    it('rejects a missing details field', () => {
        const { details: _details, ...withoutDetails } = payload;

        const result = HealthAwsResponseSchema.safeParse(withoutDetails);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['details'],
                code: 'invalid_type',
            }),
        ]);
    });
});
