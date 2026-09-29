import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { HealthIndicatorService } from '@nestjs/terminus';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

vi.mock('@sentry/nestjs', () => ({
    getClient: vi.fn(),
}));

describe('HealthSentryIndicator', () => {
    const healthIndicatorService: MockProxy<HealthIndicatorService> =
        mock<HealthIndicatorService>();
    const session = { up: vi.fn(), down: vi.fn() };

    let Sentry: typeof import('@sentry/nestjs');
    let indicator: InstanceType<
        typeof import('@modules/health/indicators/health.sentry.indicator').HealthSentryIndicator
    >;

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.resetModules();
        Sentry = await import('@sentry/nestjs');
        const { HealthSentryIndicator } =
            await import('@modules/health/indicators/health.sentry.indicator');

        healthIndicatorService.check.mockReturnValue(session as never);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HealthSentryIndicator,
                {
                    provide: HealthIndicatorService,
                    useValue: healthIndicatorService,
                },
            ],
        }).compile();

        indicator = module.get(HealthSentryIndicator);
    });

    describe('isHealthy', () => {
        it('reports down when the client is not initialized', async () => {
            vi.mocked(Sentry.getClient).mockReturnValue(undefined);
            session.down.mockReturnValue({ sentry: { status: 'down' } });

            const result = await indicator.isHealthy('sentry');

            expect(result).toEqual({ sentry: { status: 'down' } });
            expect(healthIndicatorService.check).toHaveBeenCalledWith('sentry');
            expect(session.down).toHaveBeenCalledWith(
                'Sentry client not initialized'
            );
        });

        it('reports down when the DSN is not configured', async () => {
            vi.mocked(Sentry.getClient).mockReturnValue({
                getOptions: () => ({ dsn: undefined, enabled: true }),
            } as never);
            session.down.mockReturnValue({ sentry: { status: 'down' } });

            const result = await indicator.isHealthy('sentry');

            expect(result).toEqual({ sentry: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'Sentry DSN not configured'
            );
        });

        it('reports down when Sentry is disabled', async () => {
            vi.mocked(Sentry.getClient).mockReturnValue({
                getOptions: () => ({
                    dsn: 'https://key@sentry.io/1',
                    enabled: false,
                }),
            } as never);
            session.down.mockReturnValue({ sentry: { status: 'down' } });

            const result = await indicator.isHealthy('sentry');

            expect(result).toEqual({ sentry: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith('Sentry is disabled');
        });

        it('reports up when the client is initialized, has a DSN, and is enabled', async () => {
            vi.mocked(Sentry.getClient).mockReturnValue({
                getOptions: () => ({
                    dsn: 'https://key@sentry.io/1',
                    enabled: true,
                }),
            } as never);
            session.up.mockReturnValue({ sentry: { status: 'up' } });

            const result = await indicator.isHealthy('sentry');

            expect(result).toEqual({ sentry: { status: 'up' } });
            expect(session.up).toHaveBeenCalledWith();
        });

        it('reports down with the error message when reading the client throws an Error', async () => {
            vi.mocked(Sentry.getClient).mockImplementation(() => {
                throw new Error('client unavailable');
            });
            session.down.mockReturnValue({ sentry: { status: 'down' } });

            const result = await indicator.isHealthy('sentry');

            expect(result).toEqual({ sentry: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'HealthSentryIndicator Failed - client unavailable'
            );
        });

        it('reports down with an unknown-error message when a non-Error is thrown', async () => {
            vi.mocked(Sentry.getClient).mockImplementation(() => {
                throw 'not-an-error';
            });
            session.down.mockReturnValue({ sentry: { status: 'down' } });

            const result = await indicator.isHealthy('sentry');

            expect(result).toEqual({ sentry: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'HealthSentryIndicator Failed - Unknown error'
            );
        });
    });
});
