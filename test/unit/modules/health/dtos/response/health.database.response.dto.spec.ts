import { HealthDatabaseResponseSchema } from '@modules/health/dtos/response/health.database.response.dto';
import { EnumHealthStatus } from '@modules/health/enums/health.enum';

describe('HealthDatabaseResponseSchema', () => {
    const payload = {
        status: EnumHealthStatus.ok,
        info: {
            database: { status: 'up' },
            redis: { status: 'up' },
            queue: { status: 'up' },
        },
        error: {},
        details: {
            database: { status: 'up' },
            redis: { status: 'up' },
            queue: { status: 'up' },
        },
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = HealthDatabaseResponseSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('strips an undeclared key', () => {
        const result = HealthDatabaseResponseSchema.parse({
            ...payload,
            extra: 'unexpected',
        });

        expect(result).toEqual(payload);
    });

    it('parses a payload with info and error omitted', () => {
        const { info: _info, error: _error, ...withoutOptional } = payload;

        const result = HealthDatabaseResponseSchema.parse(withoutOptional);

        expect(result).toEqual(withoutOptional);
    });

    it('rejects an invalid status value', () => {
        const result = HealthDatabaseResponseSchema.safeParse({
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

        const result = HealthDatabaseResponseSchema.safeParse(withoutDetails);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['details'],
                code: 'invalid_type',
            }),
        ]);
    });
});
