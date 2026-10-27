import { ConfigService } from '@nestjs/config';

import { HealthAppleIndicator } from '@modules/health/indicators/health.apple.indicator';
import { createHealthIndicatorHarness } from '@test/modules/health/indicators/health.indicator.spec-helper';

describe('HealthAppleIndicator', () => {
    const get = vi.fn();
    const config = { get } as unknown as ConfigService;

    it('reports configured credentials up with the exact key', async () => {
        const { health, up } = createHealthIndicatorHarness();
        const indicator = new HealthAppleIndicator(config, health);
        get.mockReturnValue('credential');
        await expect(indicator.isHealthy('apple')).resolves.toBe(up);
        expect(health.check).toHaveBeenCalledWith('apple');
    });

    it.each(['auth.apple.clientId', 'auth.apple.signInClientId'])(
        'reports missing %s down',
        async missing => {
            const { health, down } = createHealthIndicatorHarness();
            const indicator = new HealthAppleIndicator(config, health);
            get.mockImplementation((key: string | symbol) =>
                key === missing ? null : 'credential'
            );
            await expect(indicator.isHealthy('apple')).resolves.toBe(down);
        }
    );

    it.each([
        [new Error('failure'), 'failure'],
        ['failure', 'Unknown error'],
    ])('maps credential errors', async (error, message) => {
        const { health, session, down } = createHealthIndicatorHarness();
        const indicator = new HealthAppleIndicator(config, health);
        get.mockImplementationOnce(() => {
            throw error;
        });
        await expect(indicator.isHealthy('apple')).resolves.toBe(down);
        expect(session.down).toHaveBeenCalledWith(
            `HealthAppleIndicator Failed - ${message}`
        );
    });
});
