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
        expect(() =>
            HealthAwsResponseSchema.parse({ ...payload, status: 'invalid' })
        ).toThrow();
    });

    it('rejects a missing details field', () => {
        const { details: _details, ...withoutDetails } = payload;

        expect(() => HealthAwsResponseSchema.parse(withoutDetails)).toThrow();
    });
});
