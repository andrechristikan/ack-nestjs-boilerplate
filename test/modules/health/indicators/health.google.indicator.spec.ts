import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthIndicatorService } from '@nestjs/terminus';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HealthGoogleIndicator } from '@modules/health/indicators/health.google.indicator';

describe('HealthGoogleIndicator', () => {
    const configGet = vi.fn<(key: string) => string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const healthIndicatorService: MockProxy<HealthIndicatorService> =
        mock<HealthIndicatorService>();
    const session = { up: vi.fn(), down: vi.fn() };

    let indicator: HealthGoogleIndicator;

    beforeEach(async () => {
        vi.resetAllMocks();

        healthIndicatorService.check.mockReturnValue(session as never);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HealthGoogleIndicator,
                { provide: ConfigService, useValue: configService },
                {
                    provide: HealthIndicatorService,
                    useValue: healthIndicatorService,
                },
            ],
        }).compile();

        indicator = module.get(HealthGoogleIndicator);
    });

    describe('isHealthy', () => {
        it('reports down when the Google client id is missing', async () => {
            configGet.mockImplementation(key => {
                if (key === 'auth.google.clientId') {
                    return undefined;
                }

                return 'client-secret';
            });
            session.down.mockReturnValue({ google: { status: 'down' } });

            const result = await indicator.isHealthy('google');

            expect(result).toEqual({ google: { status: 'down' } });
            expect(healthIndicatorService.check).toHaveBeenCalledWith('google');
            expect(session.down).toHaveBeenCalledWith(
                'Google OAuth client id is not configured'
            );
        });

        it('reports down when the Google client secret is missing', async () => {
            configGet.mockImplementation(key => {
                if (key === 'auth.google.clientId') {
                    return 'client-id';
                }

                return undefined;
            });
            session.down.mockReturnValue({ google: { status: 'down' } });

            const result = await indicator.isHealthy('google');

            expect(result).toEqual({ google: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'Google OAuth client secret is not configured'
            );
        });

        it('reports up when both credentials are configured', async () => {
            configGet.mockImplementation(() => 'value');
            session.up.mockReturnValue({ google: { status: 'up' } });

            const result = await indicator.isHealthy('google');

            expect(result).toEqual({ google: { status: 'up' } });
            expect(session.up).toHaveBeenCalledWith();
        });

        it('reports down with the error message when reading config throws an Error', async () => {
            configGet.mockImplementation(() => {
                throw new Error('config unavailable');
            });
            session.down.mockReturnValue({ google: { status: 'down' } });

            const result = await indicator.isHealthy('google');

            expect(result).toEqual({ google: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'HealthGoogleIndicator Failed - config unavailable'
            );
        });

        it('reports down with an unknown-error message when a non-Error is thrown', async () => {
            configGet.mockImplementation(() => {
                throw 'not-an-error';
            });
            session.down.mockReturnValue({ google: { status: 'down' } });

            const result = await indicator.isHealthy('google');

            expect(result).toEqual({ google: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'HealthGoogleIndicator Failed - Unknown error'
            );
        });
    });
});
