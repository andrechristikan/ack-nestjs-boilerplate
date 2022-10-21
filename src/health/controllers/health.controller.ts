import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    DiskHealthIndicator,
    HealthCheck,
    HealthCheckService,
    MemoryHealthIndicator,
    MongooseHealthIndicator,
} from '@nestjs/terminus';
import { Connection } from 'mongoose';
import { AuthApiKey } from 'src/common/auth/decorators/auth.api-key.decorator';
import { DatabaseConnection } from 'src/common/database/decorators/database.decorator';
import {
    RequestValidateTimestamp,
    RequestValidateUserAgent,
} from 'src/common/request/decorators/request.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { HealthCheckDoc } from 'src/health/docs/health.doc';
import { AwsHealthIndicator } from 'src/health/indicators/health.aws.indicator';
import { HealthSerialization } from 'src/health/serializations/health.serialization';

@ApiTags('health')
@Controller({
    version: VERSION_NEUTRAL,
    path: '/health',
})
export class HealthController {
    constructor(
        @DatabaseConnection() private readonly databaseConnection: Connection,
        private readonly health: HealthCheckService,
        private readonly memoryHealthIndicator: MemoryHealthIndicator,
        private readonly diskHealthIndicator: DiskHealthIndicator,
        private readonly databaseIndicator: MongooseHealthIndicator,
        private readonly awsIndicator: AwsHealthIndicator
    ) {}

    @HealthCheckDoc()
    @Response('health.check', { classSerialization: HealthSerialization })
    @HealthCheck()
    @AuthApiKey()
    @RequestValidateUserAgent()
    @RequestValidateTimestamp()
    @Get('/aws')
    async checkAws(): Promise<IResponse> {
        return this.health.check([
            () => this.awsIndicator.isHealthy('awsBucket'),
        ]);
    }

    @HealthCheckDoc()
    @Response('health.check', { classSerialization: HealthSerialization })
    @HealthCheck()
    @AuthApiKey()
    @RequestValidateUserAgent()
    @RequestValidateTimestamp()
    @Get('/database')
    async checkDatabase(): Promise<IResponse> {
        return this.health.check([
            () =>
                this.databaseIndicator.pingCheck('database', {
                    connection: this.databaseConnection,
                }),
        ]);
    }

    @HealthCheckDoc()
    @Response('health.check', { classSerialization: HealthSerialization })
    @HealthCheck()
    @AuthApiKey()
    @RequestValidateUserAgent()
    @RequestValidateTimestamp()
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
    @AuthApiKey()
    @RequestValidateUserAgent()
    @RequestValidateTimestamp()
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
    @AuthApiKey()
    @RequestValidateUserAgent()
    @RequestValidateTimestamp()
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
