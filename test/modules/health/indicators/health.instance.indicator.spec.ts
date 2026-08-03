import { ConfigService } from '@nestjs/config';
import { DiskHealthIndicator, MemoryHealthIndicator } from '@nestjs/terminus';
import { HealthInstanceIndicator } from '@modules/health/indicators/health.instance.indicator';

describe('HealthInstanceIndicator', () => {
    let indicator: HealthInstanceIndicator;
    let memory: jest.Mocked<MemoryHealthIndicator>;
    let disk: jest.Mocked<DiskHealthIndicator>;

    beforeEach(() => {
        memory = {
            checkRSS: jest.fn(),
            checkHeap: jest.fn(),
        } as unknown as jest.Mocked<MemoryHealthIndicator>;
        disk = {
            checkStorage: jest.fn(),
        } as unknown as jest.Mocked<DiskHealthIndicator>;
        const config = {
            get: jest.fn(
                (key: string) =>
                    ({
                        'health.memoryRssThresholdInBytes': 314572800,
                        'health.memoryHeapThresholdInBytes': 314572800,
                        'health.diskThresholdPercent': 0.75,
                        'health.diskPath': '/',
                    })[key]
            ),
        } as unknown as ConfigService;
        indicator = new HealthInstanceIndicator(memory, disk, config);
    });

    it('isHealthyMemoryRss delegates with configured rss threshold', async () => {
        await indicator.isHealthyMemoryRss('memoryRss');
        expect(memory.checkRSS).toHaveBeenCalledWith('memoryRss', 314572800);
    });

    it('isHealthyMemoryHeap delegates with configured heap threshold', async () => {
        await indicator.isHealthyMemoryHeap('memoryHeap');
        expect(memory.checkHeap).toHaveBeenCalledWith('memoryHeap', 314572800);
    });

    it('isHealthyStorage delegates with configured path and percent', async () => {
        await indicator.isHealthyStorage('storage');
        expect(disk.checkStorage).toHaveBeenCalledWith('storage', {
            thresholdPercent: 0.75,
            path: '/',
        });
    });
});
