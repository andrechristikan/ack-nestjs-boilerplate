import { ConfigService } from '@nestjs/config';

import { HealthGoogleIndicator } from '@modules/health/indicators/health.google.indicator';
import { createHealthIndicatorHarness } from '@test/modules/health/indicators/health.indicator.spec-helper';

describe('HealthGoogleIndicator', () => {
    const get = vi.fn();
    const config = { get } as unknown as ConfigService;

    beforeEach(() => vi.resetAllMocks());

    it('reports configured credentials up with the exact key', async () => {
        const { health, up } = createHealthIndicatorHarness();
        const indicator = new HealthGoogleIndicator(config, health);
        get.mockReturnValue('credential');
        await expect(indicator.isHealthy('google')).resolves.toBe(up);
        expect(health.check).toHaveBeenCalledWith('google');
    });

    it.each(['auth.google.clientId', 'auth.google.clientSecret'])(
        'reports missing %s down',
        async missing => {
            const { health, down } = createHealthIndicatorHarness();
            const indicator = new HealthGoogleIndicator(config, health);
            get.mockImplementation((key: string | symbol) =>
                key === missing ? null : 'credential'
            );
            await expect(indicator.isHealthy('google')).resolves.toBe(down);
        }
    );

    it.each([
        [new Error('failure'), 'failure'],
        ['failure', 'Unknown error'],
    ])('maps credential errors', async (error, message) => {
        const { health, session, down } = createHealthIndicatorHarness();
        const indicator = new HealthGoogleIndicator(config, health);
        get.mockImplementationOnce(() => {
            throw error;
        });
        await expect(indicator.isHealthy('google')).resolves.toBe(down);
        expect(session.down).toHaveBeenCalledWith(
            `HealthGoogleIndicator Failed - ${message}`
        );
    });
});
