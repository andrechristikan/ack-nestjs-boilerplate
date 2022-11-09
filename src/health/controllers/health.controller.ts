import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    DiskHealthIndicator,
    HealthCheck,
    HealthCheckService,
    MemoryHealthIndicator,
    MongooseHealthIndicator,
} from '@nestjs/terminus';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { HealthCheckDoc } from 'src/health/docs/health.doc';
import { HealthAwsIndicator } from 'src/health/indicators/health.aws.indicator';
import { HealthSerialization } from 'src/health/serializations/health.serialization';

@ApiTags('health')
@Controller({
    version: VERSION_NEUTRAL,
    path: '/health',
})
export class HealthController {
    constructor(
        private readonly health: HealthCheckService,
        private readonly memoryHealthIndicator: MemoryHealthIndicator,
        private readonly diskHealthIndicator: DiskHealthIndicator,
        private readonly mongooseIndicator: MongooseHealthIndicator,
        private readonly awsIndicator: HealthAwsIndicator
    ) {}

    @HealthCheckDoc()
    @Response('health.check', { classSerialization: HealthSerialization })
    @HealthCheck()
    @Get('/aws')
    async checkAws(): Promise<IResponse> {
        return this.health.check([
            () => this.awsIndicator.isHealthy('awsBucket'),
        ]);
    }

    @HealthCheckDoc()
    @Response('health.check', { classSerialization: HealthSerialization })
    @HealthCheck()
    @Get('/database')
    async checkDatabase(): Promise<IResponse> {
        return this.health.check([
            () => this.mongooseIndicator.pingCheck('database'),
        ]);
    }

    @HealthCheckDoc()
    @Response('health.check', { classSerialization: HealthSerialization })
    @HealthCheck()
    @Get('/memory-heap')
    async checkMemoryHeap(): Promise<IResponse> {
        return this.health.check([
            () =>
                this.memoryHealthIndicator.checkHeap(
                    'memoryHeap',
                    300 * 1024 * 1024
                ),
        ]);
    }

    @HealthCheckDoc()
    @Response('health.check', { classSerialization: HealthSerialization })
    @HealthCheck()
    @Get('/memory-rss')
    async checkMemoryRss(): Promise<IResponse> {
        return this.health.check([
            () =>
                this.memoryHealthIndicator.checkRSS(
                    'memoryRss',
                    300 * 1024 * 1024
                ),
        ]);
    }

    @HealthCheckDoc()
    @Response('health.check', { classSerialization: HealthSerialization })
    @HealthCheck()
    @Get('/storage')
    async checkStorage(): Promise<IResponse> {
        return this.health.check([
            () =>
                this.diskHealthIndicator.checkStorage('diskHealth', {
                    thresholdPercent: 0.75,
                    path: '/',
                }),
        ]);
    }
}
