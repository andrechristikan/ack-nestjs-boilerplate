import { HealthThirdPartyResponseSchema } from '@modules/health/dtos/response/health.third-party.response.dto';
import { EnumHealthStatus } from '@modules/health/enums/health.enum';

describe('HealthThirdPartyResponseSchema', () => {
    const payload = {
        status: EnumHealthStatus.ok,
        info: {
            sentry: { status: 'up' },
            firebase: { status: 'up' },
            google: { status: 'up' },
            apple: { status: 'up' },
            jwksAccessToken: { status: 'up' },
            jwksRefreshToken: { status: 'up' },
        },
        error: {},
        details: {
            sentry: { status: 'up' },
            firebase: { status: 'up' },
            google: { status: 'up' },
            apple: { status: 'up' },
            jwksAccessToken: { status: 'up' },
            jwksRefreshToken: { status: 'up' },
        },
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = HealthThirdPartyResponseSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('strips an undeclared key', () => {
        const result = HealthThirdPartyResponseSchema.parse({
            ...payload,
            extra: 'unexpected',
        });

        expect(result).toEqual(payload);
    });

    it('parses a payload with info and error omitted', () => {
        const { info: _info, error: _error, ...withoutOptional } = payload;

        const result = HealthThirdPartyResponseSchema.parse(withoutOptional);

        expect(result).toEqual(withoutOptional);
    });

    it('rejects an invalid status value', () => {
        expect(() =>
            HealthThirdPartyResponseSchema.parse({
                ...payload,
                status: 'invalid',
            })
        ).toThrow();
    });

    it('rejects a missing details field', () => {
        const { details: _details, ...withoutDetails } = payload;

        expect(() =>
            HealthThirdPartyResponseSchema.parse(withoutDetails)
        ).toThrow();
    });
});
