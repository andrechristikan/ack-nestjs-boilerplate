import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthIndicatorService } from '@nestjs/terminus';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HealthAppleIndicator } from '@modules/health/indicators/health.apple.indicator';

describe('HealthAppleIndicator', () => {
    const configGet = vi.fn<(key: string) => string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const healthIndicatorService: MockProxy<HealthIndicatorService> =
        mock<HealthIndicatorService>();
    const session = { up: vi.fn(), down: vi.fn() };

    let indicator: HealthAppleIndicator;

    beforeEach(async () => {
        vi.resetAllMocks();

        healthIndicatorService.check.mockReturnValue(session as never);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HealthAppleIndicator,
                { provide: ConfigService, useValue: configService },
                {
                    provide: HealthIndicatorService,
                    useValue: healthIndicatorService,
                },
            ],
        }).compile();

        indicator = module.get(HealthAppleIndicator);
    });

    describe('isHealthy', () => {
        it('reports down when the Apple client id is missing', async () => {
            configGet.mockImplementation(key => {
                if (key === 'auth.apple.clientId') {
                    return undefined;
                }

                return 'sign-in-client';
            });
            session.down.mockReturnValue({ apple: { status: 'down' } });

            const result = await indicator.isHealthy('apple');

            expect(result).toEqual({ apple: { status: 'down' } });
            expect(healthIndicatorService.check).toHaveBeenCalledWith('apple');
            expect(session.down).toHaveBeenCalledWith(
                'Apple client id is not configured'
            );
        });

        it('reports down when the Apple sign-in client id is missing', async () => {
            configGet.mockImplementation(key => {
                if (key === 'auth.apple.clientId') {
                    return 'client';
                }

                return undefined;
            });
            session.down.mockReturnValue({ apple: { status: 'down' } });

            const result = await indicator.isHealthy('apple');

            expect(result).toEqual({ apple: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'Apple sign-in client id is not configured'
            );
        });

        it('reports up when both credentials are configured', async () => {
            configGet.mockImplementation(() => 'value');
            session.up.mockReturnValue({ apple: { status: 'up' } });

            const result = await indicator.isHealthy('apple');

            expect(result).toEqual({ apple: { status: 'up' } });
            expect(session.up).toHaveBeenCalledWith();
        });

        it('reports down with the error message when reading config throws an Error', async () => {
            configGet.mockImplementation(() => {
                throw new Error('config unavailable');
            });
            session.down.mockReturnValue({ apple: { status: 'down' } });

            const result = await indicator.isHealthy('apple');

            expect(result).toEqual({ apple: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'HealthAppleIndicator Failed - config unavailable'
            );
        });

        it('reports down with an unknown-error message when a non-Error is thrown', async () => {
            configGet.mockImplementation(() => {
                throw 'not-an-error';
            });
            session.down.mockReturnValue({ apple: { status: 'down' } });

            const result = await indicator.isHealthy('apple');

            expect(result).toEqual({ apple: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'HealthAppleIndicator Failed - Unknown error'
            );
        });
    });
});
