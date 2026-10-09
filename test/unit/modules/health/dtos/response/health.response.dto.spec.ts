import { HealthResponseSchema } from '@modules/health/dtos/response/health.response.dto';
import { EnumHealthStatus } from '@modules/health/enums/health.enum';

describe('HealthResponseSchema', () => {
    const payload = {
        status: EnumHealthStatus.ok,
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = HealthResponseSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('strips an undeclared key', () => {
        const result = HealthResponseSchema.parse({
            ...payload,
            extra: 'unexpected',
        });

        expect(result).toEqual(payload);
    });

    it('parses a payload with info and error omitted', () => {
        const { info: _info, error: _error, ...withoutOptional } = payload;

        const result = HealthResponseSchema.parse(withoutOptional);

        expect(result).toEqual(withoutOptional);
    });

    it('rejects an invalid status value', () => {
        expect(() =>
            HealthResponseSchema.parse({ ...payload, status: 'invalid' })
        ).toThrow();
    });

    it('rejects a missing details field', () => {
        const { details: _details, ...withoutDetails } = payload;

        expect(() => HealthResponseSchema.parse(withoutDetails)).toThrow();
    });
});
