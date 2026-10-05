import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DiskHealthIndicator, MemoryHealthIndicator } from '@nestjs/terminus';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HealthInstanceIndicator } from '@modules/health/indicators/health.instance.indicator';

describe('HealthInstanceIndicator', () => {
    const configGet = vi.fn<(key: string) => number | string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const memoryHealthIndicator: MockProxy<MemoryHealthIndicator> =
        mock<MemoryHealthIndicator>();
    const diskHealthIndicator: MockProxy<DiskHealthIndicator> =
        mock<DiskHealthIndicator>();

    let indicator: HealthInstanceIndicator;

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) => {
            const values: Record<string, number | string> = {
                'health.memoryRssThresholdInBytes': 314572800,
                'health.memoryHeapThresholdInBytes': 157286400,
                'health.diskThresholdPercent': 0.9,
                'health.diskPath': '/',
            };

            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HealthInstanceIndicator,
                {
                    provide: MemoryHealthIndicator,
                    useValue: memoryHealthIndicator,
                },
                { provide: DiskHealthIndicator, useValue: diskHealthIndicator },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        indicator = module.get(HealthInstanceIndicator);
    });

    describe('isHealthyMemoryRss', () => {
        it('checks the resident set size against the configured threshold', async () => {
            memoryHealthIndicator.checkRSS.mockResolvedValue({
                memoryRss: { status: 'up' },
            });

            const result = await indicator.isHealthyMemoryRss('memoryRss');

            expect(result).toEqual({ memoryRss: { status: 'up' } });
            expect(memoryHealthIndicator.checkRSS).toHaveBeenCalledWith(
                'memoryRss',
                314572800
            );
        });
    });

    describe('isHealthyMemoryHeap', () => {
        it('checks the used heap against the configured threshold', async () => {
            memoryHealthIndicator.checkHeap.mockResolvedValue({
                memoryHeap: { status: 'up' },
            });

            const result = await indicator.isHealthyMemoryHeap('memoryHeap');

            expect(result).toEqual({ memoryHeap: { status: 'up' } });
            expect(memoryHealthIndicator.checkHeap).toHaveBeenCalledWith(
                'memoryHeap',
                157286400
            );
        });
    });

    describe('isHealthyStorage', () => {
        it('checks disk usage of the configured path against the configured threshold', async () => {
            diskHealthIndicator.checkStorage.mockResolvedValue({
                storage: { status: 'up' },
            });

            const result = await indicator.isHealthyStorage('storage');

            expect(result).toEqual({ storage: { status: 'up' } });
            expect(diskHealthIndicator.checkStorage).toHaveBeenCalledWith(
                'storage',
                { thresholdPercent: 0.9, path: '/' }
            );
        });
    });
});
