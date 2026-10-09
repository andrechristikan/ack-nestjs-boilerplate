import { HealthInstanceResponseSchema } from '@modules/health/dtos/response/health.instance.response.dto';
import { EnumHealthStatus } from '@modules/health/enums/health.enum';

describe('HealthInstanceResponseSchema', () => {
    const payload = {
        status: EnumHealthStatus.ok,
        info: {
            memoryRss: { status: 'up' },
            memoryHeap: { status: 'up' },
            storage: { status: 'up' },
        },
        error: {},
        details: {
            memoryRss: { status: 'up' },
            memoryHeap: { status: 'up' },
            storage: { status: 'up' },
        },
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = HealthInstanceResponseSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('strips an undeclared key', () => {
        const result = HealthInstanceResponseSchema.parse({
            ...payload,
            extra: 'unexpected',
        });

        expect(result).toEqual(payload);
    });

    it('parses a payload with info and error omitted', () => {
        const { info: _info, error: _error, ...withoutOptional } = payload;

        const result = HealthInstanceResponseSchema.parse(withoutOptional);

        expect(result).toEqual(withoutOptional);
    });

    it('rejects an invalid status value', () => {
        expect(() =>
            HealthInstanceResponseSchema.parse({
                ...payload,
                status: 'invalid',
            })
        ).toThrow();
    });

    it('rejects a missing details field', () => {
        const { details: _details, ...withoutDetails } = payload;

        expect(() =>
            HealthInstanceResponseSchema.parse(withoutDetails)
        ).toThrow();
    });
});
