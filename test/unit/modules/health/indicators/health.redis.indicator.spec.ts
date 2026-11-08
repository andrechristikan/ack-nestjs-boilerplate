import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { HealthIndicatorService } from '@nestjs/terminus';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type Keyv from 'keyv';
import type KeyvRedis from '@keyv/redis';
import { RedisClientCachedProvider } from '@common/redis/constants/redis.constant';
import { HealthRedisIndicator } from '@modules/health/indicators/health.redis.indicator';
import { EnumHealthIndicatorKey } from '@modules/health/enums/health.enum';
import { stubStoreClient } from '@test/unit/helpers/test.unit.cache.helper';

describe('HealthRedisIndicator', () => {
    const keyv: MockProxy<Keyv> = mock<Keyv>();
    const store: MockProxy<KeyvRedis<string>> = mock<KeyvRedis<string>>();
    const healthIndicatorService: MockProxy<HealthIndicatorService> =
        mock<HealthIndicatorService>();
    const session = { up: vi.fn(), down: vi.fn() };

    let indicator: HealthRedisIndicator;

    beforeEach(async () => {
        vi.resetAllMocks();

        (keyv as unknown as { store: KeyvRedis<string> }).store = store;
        healthIndicatorService.check.mockReturnValue(session as never);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HealthRedisIndicator,
                { provide: RedisClientCachedProvider, useValue: keyv },
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
            const client = stubStoreClient({ keyv, store });
            client.ping.mockResolvedValue('PONG');
            session.up.mockReturnValue({ redis: { status: 'up' } });

            const result = await indicator.isHealthy(
                EnumHealthIndicatorKey.redis
            );

            expect(result).toEqual({ redis: { status: 'up' } });
            expect(healthIndicatorService.check).toHaveBeenCalledWith('redis');
            expect(client.ping).toHaveBeenCalledWith();
            expect(session.up).toHaveBeenCalledWith();
        });

        it("reports down with 'Redis is unreachable' when PING rejects", async () => {
            const client = stubStoreClient({ keyv, store });
            client.ping.mockRejectedValue(new Error('redis down'));
            session.down.mockReturnValue({ redis: { status: 'down' } });

            const result = await indicator.isHealthy(
                EnumHealthIndicatorKey.redis
            );

            expect(result).toEqual({ redis: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith('Redis is unreachable');
            expect(session.up).not.toHaveBeenCalled();
        });

        it('reports down when the store client cannot connect', async () => {
            store.getClient.mockRejectedValue(new Error('connect timeout'));
            session.down.mockReturnValue({ redis: { status: 'down' } });

            const result = await indicator.isHealthy(
                EnumHealthIndicatorKey.redis
            );

            expect(result).toEqual({ redis: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith('Redis is unreachable');
        });
    });
});
