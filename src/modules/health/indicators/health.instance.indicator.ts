import { EnumHealthIndicatorKey } from '@modules/health/enums/health.enum';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiskHealthIndicator, MemoryHealthIndicator } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';

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

    async isHealthyMemoryRss(
        key: EnumHealthIndicatorKey
    ): Promise<HealthIndicatorResult> {
        return await this.memoryHealthIndicator.checkRSS(
            key,
            this.memoryRssThresholdInBytes
        );
    }

    async isHealthyMemoryHeap(
        key: EnumHealthIndicatorKey
    ): Promise<HealthIndicatorResult> {
        return await this.memoryHealthIndicator.checkHeap(
            key,
            this.memoryHeapThresholdInBytes
        );
    }

    async isHealthyStorage(
        key: EnumHealthIndicatorKey
    ): Promise<HealthIndicatorResult> {
        return await this.diskHealthIndicator.checkStorage(key, {
            thresholdPercent: this.diskThresholdPercent,
            path: this.diskPath,
        });
    }
}
