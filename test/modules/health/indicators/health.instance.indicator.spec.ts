import { ConfigService } from '@nestjs/config';
import { DiskHealthIndicator, MemoryHealthIndicator } from '@nestjs/terminus';
import { mock } from 'vitest-mock-extended';

import { HealthInstanceIndicator } from '@modules/health/indicators/health.instance.indicator';

describe('HealthInstanceIndicator', () => {
    const memory = mock<MemoryHealthIndicator>();
    const disk = mock<DiskHealthIndicator>();
    const config = mock<ConfigService>();

    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(config.get).mockImplementation((key: string) => {
            if (key === 'health.memoryRssThresholdInBytes') return 100;
            if (key === 'health.memoryHeapThresholdInBytes') return 200;
            if (key === 'health.diskThresholdPercent') return 0.9;
            if (key === 'health.diskPath') return '/data';
            return undefined;
        });
    });

    it('passes configured threshold boundaries and exact keys to Terminus', async () => {
        const indicator = new HealthInstanceIndicator(memory, disk, config);
        const result = { resource: { status: 'up' } } as never;
        memory.checkRSS.mockResolvedValue(result);
        memory.checkHeap.mockResolvedValue(result);
        disk.checkStorage.mockResolvedValue(result);

        await expect(indicator.isHealthyMemoryRss('memoryRss')).resolves.toBe(
            result
        );
        await expect(indicator.isHealthyMemoryHeap('memoryHeap')).resolves.toBe(
            result
        );
        await expect(indicator.isHealthyStorage('storage')).resolves.toBe(
            result
        );
        expect(memory.checkRSS).toHaveBeenCalledWith('memoryRss', 100);
        expect(memory.checkHeap).toHaveBeenCalledWith('memoryHeap', 200);
        expect(disk.checkStorage).toHaveBeenCalledWith('storage', {
            thresholdPercent: 0.9,
            path: '/data',
        });
    });
});
