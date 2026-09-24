import * as Sentry from '@sentry/nestjs';

import { HealthSentryIndicator } from '@modules/health/indicators/health.sentry.indicator';
import { createHealthIndicatorHarness } from '@test/modules/health/indicators/health.indicator.spec-helper';

vi.mock('@sentry/nestjs', () => ({ getClient: vi.fn() }));

describe('HealthSentryIndicator', () => {
    const getClient = vi.mocked(Sentry.getClient);

    it.each([
        [undefined, 'Sentry client not initialized'],
        [{ getOptions: () => ({}) }, 'Sentry DSN not configured'],
        [
            { getOptions: () => ({ dsn: 'dsn', enabled: false }) },
            'Sentry is disabled',
        ],
    ])('reports unavailable configurations down', async (client, message) => {
        const { health, session, down } = createHealthIndicatorHarness();
        const indicator = new HealthSentryIndicator(health);
        getClient.mockReturnValue(client as never);
        await expect(indicator.isHealthy('sentry')).resolves.toBe(down);
        expect(health.check).toHaveBeenCalledWith('sentry');
        expect(session.down).toHaveBeenCalledWith(message);
    });

    it('reports an enabled client up', async () => {
        const { health, up } = createHealthIndicatorHarness();
        const indicator = new HealthSentryIndicator(health);
        getClient.mockReturnValue({
            getOptions: () => ({ dsn: 'dsn', enabled: true }),
        } as never);
        await expect(indicator.isHealthy('sentry')).resolves.toBe(up);
    });

    it.each([
        [new Error('failure'), 'failure'],
        ['failure', 'Unknown error'],
    ])('maps client errors', async (error, message) => {
        const { health, session, down } = createHealthIndicatorHarness();
        const indicator = new HealthSentryIndicator(health);
        getClient.mockImplementationOnce(() => {
            throw error;
        });
        await expect(indicator.isHealthy('sentry')).resolves.toBe(down);
        expect(session.down).toHaveBeenCalledWith(
            `HealthSentryIndicator Failed - ${message}`
        );
    });
});
