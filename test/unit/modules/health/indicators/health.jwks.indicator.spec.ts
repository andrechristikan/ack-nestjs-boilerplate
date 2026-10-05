import { HealthIndicatorService } from '@nestjs/terminus';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { createHealthJwksIndicator } from '@test/unit/helpers/test.unit.health.helper';

describe('HealthJwksIndicator', () => {
    const healthIndicatorService: MockProxy<HealthIndicatorService> =
        mock<HealthIndicatorService>();
    const session = { up: vi.fn(), down: vi.fn() };

    beforeEach(() => {
        vi.resetAllMocks();

        healthIndicatorService.check.mockReturnValue(session as never);
    });

    describe('isHealthyAccessToken', () => {
        it('reports up when the access-token JWKS URI is a valid URL', async () => {
            const configService = buildConfigService({
                'auth.jwt.accessToken.jwksUri': 'https://issuer.example/jwks',
            });
            const indicator = await createHealthJwksIndicator(
                configService,
                healthIndicatorService
            );
            session.up.mockReturnValue({
                jwksAccessToken: { status: 'up' },
            });

            const result =
                await indicator.isHealthyAccessToken('jwksAccessToken');

            expect(result).toEqual({ jwksAccessToken: { status: 'up' } });
            expect(configService.get).toHaveBeenCalledWith(
                'auth.jwt.accessToken.jwksUri'
            );
        });

        it('reports down when the access-token JWKS URI is not configured', async () => {
            const configService = buildConfigService({});
            const indicator = await createHealthJwksIndicator(
                configService,
                healthIndicatorService
            );
            session.down.mockReturnValue({
                jwksAccessToken: { status: 'down' },
            });

            const result =
                await indicator.isHealthyAccessToken('jwksAccessToken');

            expect(result).toEqual({ jwksAccessToken: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'JWKS URI is not configured'
            );
        });
    });

    describe('isHealthyRefreshToken', () => {
        it('reports up when the refresh-token JWKS URI is a valid URL', async () => {
            const configService = buildConfigService({
                'auth.jwt.refreshToken.jwksUri': 'https://issuer.example/jwks',
            });
            const indicator = await createHealthJwksIndicator(
                configService,
                healthIndicatorService
            );
            session.up.mockReturnValue({
                jwksRefreshToken: { status: 'up' },
            });

            const result =
                await indicator.isHealthyRefreshToken('jwksRefreshToken');

            expect(result).toEqual({ jwksRefreshToken: { status: 'up' } });
            expect(configService.get).toHaveBeenCalledWith(
                'auth.jwt.refreshToken.jwksUri'
            );
        });

        it('reports down when the refresh-token JWKS URI is not a valid URL', async () => {
            const configService = buildConfigService({
                'auth.jwt.refreshToken.jwksUri': 'not-a-valid-url',
            });
            const indicator = await createHealthJwksIndicator(
                configService,
                healthIndicatorService
            );
            session.down.mockReturnValue({
                jwksRefreshToken: { status: 'down' },
            });

            const result =
                await indicator.isHealthyRefreshToken('jwksRefreshToken');

            expect(result).toEqual({ jwksRefreshToken: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'JWKS URI is not a valid URL'
            );
        });
    });

    describe('checkUri', () => {
        it('reports down when the URI is empty', async () => {
            const configService = buildConfigService({});
            const indicator = await createHealthJwksIndicator(
                configService,
                healthIndicatorService
            );
            session.down.mockReturnValue({ jwks: { status: 'down' } });

            const result = await indicator['checkUri']('jwks', undefined);

            expect(result).toEqual({ jwks: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'JWKS URI is not configured'
            );
        });

        it('reports down when the URI is not a valid URL', async () => {
            const configService = buildConfigService({});
            const indicator = await createHealthJwksIndicator(
                configService,
                healthIndicatorService
            );
            session.down.mockReturnValue({ jwks: { status: 'down' } });

            const result = await indicator['checkUri']('jwks', 'not-a-url');

            expect(result).toEqual({ jwks: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'JWKS URI is not a valid URL'
            );
        });

        it('reports up when the URI is a valid URL', async () => {
            const configService = buildConfigService({});
            const indicator = await createHealthJwksIndicator(
                configService,
                healthIndicatorService
            );
            session.up.mockReturnValue({ jwks: { status: 'up' } });

            const result = await indicator['checkUri'](
                'jwks',
                'https://issuer.example/jwks'
            );

            expect(result).toEqual({ jwks: { status: 'up' } });
            expect(session.up).toHaveBeenCalledWith();
        });
    });
});
