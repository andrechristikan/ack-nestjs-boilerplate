import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { HealthIndicatorService } from '@nestjs/terminus';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { RedisCacheClient } from '@common/redis/constants/redis.constant';
import { HealthRedisIndicator } from '@modules/health/indicators/health.redis.indicator';
import { EnumHealthIndicatorKey } from '@modules/health/enums/health.enum';
import type { IStubCacheClient } from '@test/unit/helpers/test.unit.cache.helper';

describe('HealthRedisIndicator', () => {
    const redis: MockProxy<IStubCacheClient> = mock<IStubCacheClient>();
    const healthIndicatorService: MockProxy<HealthIndicatorService> =
        mock<HealthIndicatorService>();
    const session = { up: vi.fn(), down: vi.fn() };

    let indicator: HealthRedisIndicator;

    beforeEach(async () => {
        healthIndicatorService.check.mockReturnValue(session as never);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HealthRedisIndicator,
                { provide: RedisCacheClient, useValue: redis },
                {
                    provide: HealthIndicatorService,
                    useValue: healthIndicatorService,
                },
            ],
        }).compile();

        indicator = module.get(HealthRedisIndicator);
    });

    describe('isHealthy', () => {
        it('reports up when PING answers', async () => {
            redis.ping.mockResolvedValue('PONG');
            session.up.mockReturnValue({ redis: { status: 'up' } });

            const result = await indicator.isHealthy(
                EnumHealthIndicatorKey.redis
            );

            expect(result).toEqual({ redis: { status: 'up' } });
            expect(healthIndicatorService.check).toHaveBeenCalledWith('redis');
            expect(redis.ping).toHaveBeenCalledWith();
            expect(session.up).toHaveBeenCalledWith();
        });

        it("reports down with 'Redis is unreachable' when PING rejects", async () => {
            redis.ping.mockRejectedValue(new Error('Connection is closed.'));
            session.down.mockReturnValue({ redis: { status: 'down' } });

            const result = await indicator.isHealthy(
                EnumHealthIndicatorKey.redis
            );

            expect(result).toEqual({ redis: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith('Redis is unreachable');
            expect(session.up).not.toHaveBeenCalled();
        });
    });
});
