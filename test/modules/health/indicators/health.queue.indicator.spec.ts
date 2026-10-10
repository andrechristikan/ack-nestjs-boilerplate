import type { Queue } from 'bullmq';
import { mock } from 'vitest-mock-extended';

import { HealthQueueIndicator } from '@modules/health/indicators/health.queue.indicator';
import { createHealthIndicatorHarness } from '@test/modules/health/indicators/health.indicator.spec-helper';

describe('HealthQueueIndicator', () => {
    const queue = mock<Queue>();

    it.each([undefined, 'connecting'])(
        'reports a non-ready client down',
        async status => {
            const { health, down } = createHealthIndicatorHarness();
            const indicator = new HealthQueueIndicator(queue, health);
            queue.getBackend.mockReturnValue({
                client: Promise.resolve(status ? { status } : undefined),
            } as never);
            await expect(indicator.isHealthy('queue')).resolves.toBe(down);
            expect(health.check).toHaveBeenCalledWith('queue');
        }
    );

    it('reports a ready client up', async () => {
        const { health, up } = createHealthIndicatorHarness();
        const indicator = new HealthQueueIndicator(queue, health);
        queue.getBackend.mockReturnValue({
            client: Promise.resolve({ status: 'ready' }),
        } as never);
        await expect(indicator.isHealthy('queue')).resolves.toBe(up);
    });

    it('maps backend failures down', async () => {
        const { health, session, down } = createHealthIndicatorHarness();
        const indicator = new HealthQueueIndicator(queue, health);
        queue.getBackend.mockImplementation(() => {
            throw new Error('offline');
        });
        await expect(indicator.isHealthy('queue')).resolves.toBe(down);
        expect(session.down).toHaveBeenCalledWith(
            'HealthQueueIndicator Failed - Unknown error'
        );
    });
});
