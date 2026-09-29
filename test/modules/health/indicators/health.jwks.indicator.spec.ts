import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthIndicatorService } from '@nestjs/terminus';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HealthJwksIndicator } from '@modules/health/indicators/health.jwks.indicator';

describe('HealthJwksIndicator', () => {
    const configGet = vi.fn<(key: string) => string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const healthIndicatorService: MockProxy<HealthIndicatorService> =
        mock<HealthIndicatorService>();
    const session = { up: vi.fn(), down: vi.fn() };

    let indicator: HealthJwksIndicator;

    beforeEach(async () => {
        vi.resetAllMocks();

        healthIndicatorService.check.mockReturnValue(session as never);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HealthJwksIndicator,
                { provide: ConfigService, useValue: configService },
                {
                    provide: HealthIndicatorService,
                    useValue: healthIndicatorService,
                },
            ],
        }).compile();

        indicator = module.get(HealthJwksIndicator);
    });

    describe('isHealthyAccessToken', () => {
        it('reports up when the access-token JWKS URI is a valid URL', async () => {
            configGet.mockReturnValue('https://issuer.example/jwks');
            session.up.mockReturnValue({
                jwksAccessToken: { status: 'up' },
            });

            const result =
                await indicator.isHealthyAccessToken('jwksAccessToken');

            expect(result).toEqual({ jwksAccessToken: { status: 'up' } });
            expect(configGet).toHaveBeenCalledWith(
                'auth.jwt.accessToken.jwksUri'
            );
        });

        it('reports down when the access-token JWKS URI is not configured', async () => {
            configGet.mockReturnValue(undefined);
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
            configGet.mockReturnValue('https://issuer.example/jwks');
            session.up.mockReturnValue({
                jwksRefreshToken: { status: 'up' },
            });

            const result =
                await indicator.isHealthyRefreshToken('jwksRefreshToken');

            expect(result).toEqual({ jwksRefreshToken: { status: 'up' } });
            expect(configGet).toHaveBeenCalledWith(
                'auth.jwt.refreshToken.jwksUri'
            );
        });

        it('reports down when the refresh-token JWKS URI is not a valid URL', async () => {
            configGet.mockReturnValue('not-a-valid-url');
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
            session.down.mockReturnValue({ jwks: { status: 'down' } });

            const result = await indicator['checkUri']('jwks', undefined);

            expect(result).toEqual({ jwks: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'JWKS URI is not configured'
            );
        });

        it('reports down when the URI is not a valid URL', async () => {
            session.down.mockReturnValue({ jwks: { status: 'down' } });

            const result = await indicator['checkUri']('jwks', 'not-a-url');

            expect(result).toEqual({ jwks: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'JWKS URI is not a valid URL'
            );
        });

        it('reports up when the URI is a valid URL', async () => {
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
