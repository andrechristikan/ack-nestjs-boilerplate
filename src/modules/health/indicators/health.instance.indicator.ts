import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    DiskHealthIndicator,
    HealthIndicatorResult,
    MemoryHealthIndicator,
} from '@nestjs/terminus';

@Injectable()
export class HealthInstanceIndicator {
    private readonly memoryRssThresholdInBytes: number;
    private readonly memoryHeapThresholdInBytes: number;
    private readonly diskThresholdPercent: number;
    private readonly diskPath: string;

    constructor(
        private readonly memoryHealthIndicator: MemoryHealthIndicator,
        private readonly diskHealthIndicator: DiskHealthIndicator,
        private readonly configService: ConfigService
    ) {
        this.memoryRssThresholdInBytes = this.configService.get<number>(
            'health.memoryRssThresholdInBytes'
        )!;
        this.memoryHeapThresholdInBytes = this.configService.get<number>(
            'health.memoryHeapThresholdInBytes'
        )!;
        this.diskThresholdPercent = this.configService.get<number>(
            'health.diskThresholdPercent'
        )!;
        this.diskPath = this.configService.get<string>('health.diskPath')!;
    }

    /**
     * Checks resident set size against `health.memoryRssThresholdInBytes`.
     */
    isHealthyMemoryRss(key: string): Promise<HealthIndicatorResult> {
        return this.memoryHealthIndicator.checkRSS(
            key,
            this.memoryRssThresholdInBytes
        );
    }

    /**
     * Checks used heap against `health.memoryHeapThresholdInBytes`.
     */
    isHealthyMemoryHeap(key: string): Promise<HealthIndicatorResult> {
        return this.memoryHealthIndicator.checkHeap(
            key,
            this.memoryHeapThresholdInBytes
        );
    }

    /**
     * Checks disk usage of `health.diskPath` against `health.diskThresholdPercent`.
     */
    isHealthyStorage(key: string): Promise<HealthIndicatorResult> {
        return this.diskHealthIndicator.checkStorage(key, {
            thresholdPercent: this.diskThresholdPercent,
            path: this.diskPath,
        });
    }
}
