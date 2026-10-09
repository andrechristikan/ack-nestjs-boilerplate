import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { HealthIndicatorService } from '@nestjs/terminus';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HealthRedisProbeKey } from '@modules/health/constants/health.constant';
import { HealthRedisIndicator } from '@modules/health/indicators/health.redis.indicator';
import type { Cache } from 'cache-manager';

describe('HealthRedisIndicator', () => {
    const cacheManager: MockProxy<Cache> = mock<Cache>();
    const healthIndicatorService: MockProxy<HealthIndicatorService> =
        mock<HealthIndicatorService>();
    const session = { up: vi.fn(), down: vi.fn() };

    let indicator: HealthRedisIndicator;

    beforeEach(async () => {
        vi.resetAllMocks();

        healthIndicatorService.check.mockReturnValue(session as never);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HealthRedisIndicator,
                { provide: CacheMainProvider, useValue: cacheManager },
                {
                    provide: HealthIndicatorService,
                    useValue: healthIndicatorService,
                },
            ],
        }).compile();

        indicator = module.get(HealthRedisIndicator);
    });

    describe('isHealthy', () => {
        it('reports up when the probe read resolves', async () => {
            cacheManager.get.mockResolvedValue(undefined);
            session.up.mockReturnValue({ redis: { status: 'up' } });

            const result = await indicator.isHealthy('redis');

            expect(result).toEqual({ redis: { status: 'up' } });
            expect(healthIndicatorService.check).toHaveBeenCalledWith('redis');
            expect(cacheManager.get).toHaveBeenCalledWith(HealthRedisProbeKey);
            expect(session.up).toHaveBeenCalledWith();
        });

        it('reports down with the error message when the probe read throws an Error', async () => {
            cacheManager.get.mockRejectedValue(new Error('redis down'));
            session.down.mockReturnValue({ redis: { status: 'down' } });

            const result = await indicator.isHealthy('redis');

            expect(result).toEqual({ redis: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'HealthRedisIndicator Failed - redis down'
            );
        });

        it('reports down with an unknown-error message when a non-Error is thrown', async () => {
            cacheManager.get.mockRejectedValue('not-an-error');
            session.down.mockReturnValue({ redis: { status: 'down' } });

            const result = await indicator.isHealthy('redis');

            expect(result).toEqual({ redis: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'HealthRedisIndicator Failed - Unknown error'
            );
        });
    });
});
