import type { Cache } from 'cache-manager';
import { mock } from 'vitest-mock-extended';

import { HealthRedisIndicator } from '@modules/health/indicators/health.redis.indicator';
import { createHealthIndicatorHarness } from '@test/modules/health/indicators/health.indicator.spec-helper';

describe('HealthRedisIndicator', () => {
    const cache = mock<Cache>();

    beforeEach(() => vi.resetAllMocks());

    it('reports healthy with the exact key', async () => {
        const { health, session, up } = createHealthIndicatorHarness();
        const indicator = new HealthRedisIndicator(cache, health);
        await expect(indicator.isHealthy('redis')).resolves.toBe(up);
        expect(health.check).toHaveBeenCalledWith('redis');
        expect(cache.get).toHaveBeenCalledWith('health-check');
        expect(session.up).toHaveBeenCalledOnce();
    });

    it.each([
        [new Error('offline'), 'offline'],
        ['failure', 'Unknown error'],
    ])('maps dependency errors', async (error, message) => {
        const { health, session, down } = createHealthIndicatorHarness();
        const indicator = new HealthRedisIndicator(cache, health);
        cache.get.mockRejectedValueOnce(error);
        await expect(indicator.isHealthy('redis')).resolves.toBe(down);
        expect(session.down).toHaveBeenCalledWith(
            `HealthRedisIndicator Failed - ${message}`
        );
    });
});
