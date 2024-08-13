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
import { ApiKeySystemProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import { DatabaseConnection } from 'src/common/database/decorators/database.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { HealthResponseDto } from 'src/modules/health/dtos/response/health.response.dto';
import { HealthAwsS3Indicator } from 'src/modules/health/indicators/health.aws-s3.indicator';
import { HealthSystemCheckDoc } from 'src/modules/health/docs/health.system.doc';

@ApiTags('modules.system.health')
@Controller({
    version: VERSION_NEUTRAL,
    path: '/health',
})
export class HealthSystemController {
    constructor(
        @DatabaseConnection() private readonly databaseConnection: Connection,
        private readonly health: HealthCheckService,
        private readonly memoryHealthIndicator: MemoryHealthIndicator,
        private readonly diskHealthIndicator: DiskHealthIndicator,
        private readonly mongooseIndicator: MongooseHealthIndicator,
        private readonly awsS3Indicator: HealthAwsS3Indicator
    ) {}

    @HealthSystemCheckDoc()
    @Response('health.check')
    @HealthCheck()
    @ApiKeySystemProtected()
    @Get('/aws')
    async checkAws(): Promise<IResponse<HealthResponseDto>> {
        const data = await this.health.check([
            () => this.awsS3Indicator.isHealthy('awsS3Bucket'),
        ]);

        return {
            data: data as HealthResponseDto,
        };
    }

    @HealthSystemCheckDoc()
    @Response('health.check')
    @HealthCheck()
    @ApiKeySystemProtected()
    @Get('/database')
    async checkDatabase(): Promise<IResponse<HealthResponseDto>> {
        const data = await this.health.check([
            () =>
                this.mongooseIndicator.pingCheck('database', {
                    connection: this.databaseConnection,
                }),
        ]);
        return {
            data: data as HealthResponseDto,
        };
    }

    @HealthSystemCheckDoc()
    @Response('health.check')
    @HealthCheck()
    @ApiKeySystemProtected()
    @Get('/memory-heap')
    async checkMemoryHeap(): Promise<IResponse<HealthResponseDto>> {
        const data = await this.health.check([
            () =>
                this.memoryHealthIndicator.checkHeap(
                    'memoryHeap',
                    300 * 1024 * 1024
                ),
        ]);

        return {
            data: data as HealthResponseDto,
        };
    }

    @HealthSystemCheckDoc()
    @Response('health.check')
    @HealthCheck()
    @ApiKeySystemProtected()
    @Get('/memory-rss')
    async checkMemoryRss(): Promise<IResponse<HealthResponseDto>> {
        const data = await this.health.check([
            () =>
                this.memoryHealthIndicator.checkRSS(
                    'memoryRss',
                    300 * 1024 * 1024
                ),
        ]);

        return {
            data: data as HealthResponseDto,
        };
    }

    @HealthSystemCheckDoc()
    @Response('health.check')
    @HealthCheck()
    @ApiKeySystemProtected()
    @Get('/storage')
    async checkStorage(): Promise<IResponse<HealthResponseDto>> {
        const data = await this.health.check([
            () =>
                this.diskHealthIndicator.checkStorage('diskHealth', {
                    thresholdPercent: 0.75,
                    path: '/',
                }),
        ]);

        return {
            data: data as HealthResponseDto,
        };
    }
}
