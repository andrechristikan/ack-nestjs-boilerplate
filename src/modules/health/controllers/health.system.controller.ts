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
import { InjectDatabaseConnection } from 'src/common/database/decorators/database.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import {
    HealthAwsS3PrivateBucketIndicator,
    HealthAwsS3PublicBucketIndicator,
} from 'src/modules/health/indicators/health.aws-s3.indicator';
import { HealthAwsResponseDto } from 'src/modules/health/dtos/response/health.aws.response.dto';
import { HealthDatabaseResponseDto } from 'src/modules/health/dtos/response/health.database.response.dto';
import {
    HealthSystemCheckAwsDoc,
    HealthSystemCheckDatabaseDoc,
    HealthSystemCheckInstanceDoc,
} from 'src/modules/health/docs/health.system.doc';
import { HealthInstanceResponseDto } from 'src/modules/health/dtos/response/health.instance.response.dto';
import { HealthAwsSESIndicator } from 'src/modules/health/indicators/health.aws-ses.indicator';
import { HealthAwsPinpointIndicator } from 'src/modules/health/indicators/health.aws-pinpoint.indicator';

@ApiTags('modules.system.health')
@Controller({
    version: VERSION_NEUTRAL,
    path: '/health',
})
export class HealthSystemController {
    constructor(
        @InjectDatabaseConnection()
        private readonly databaseConnection: Connection,
        private readonly health: HealthCheckService,
        private readonly memoryHealthIndicator: MemoryHealthIndicator,
        private readonly diskHealthIndicator: DiskHealthIndicator,
        private readonly mongooseIndicator: MongooseHealthIndicator,
        private readonly awsS3PublicBucketIndicator: HealthAwsS3PublicBucketIndicator,
        private readonly awsS3PrivateBucketIndicator: HealthAwsS3PrivateBucketIndicator,
        private readonly awsSESIndicator: HealthAwsSESIndicator,
        private readonly awsPinPointIndicator: HealthAwsPinpointIndicator
    ) {}

    // TODO: (v8) MORE HEALTH CHECK
    // - google
    // - apple
    // - sentry
    // - redis

    @HealthSystemCheckAwsDoc()
    @Response('health.checkAws')
    @HealthCheck()
    @ApiKeySystemProtected()
    @Get('/aws')
    async checkAws(): Promise<IResponse<HealthAwsResponseDto>> {
        const data = await this.health.check([
            () => this.awsS3PublicBucketIndicator.isHealthy('s3PublicBucket'),
            () => this.awsS3PrivateBucketIndicator.isHealthy('s3PrivateBucket'),
            () => this.awsSESIndicator.isHealthy('ses'),
            () => this.awsPinPointIndicator.isHealthy('pinpoint'),
        ]);

        return {
            data,
        };
    }

    @HealthSystemCheckDatabaseDoc()
    @Response('health.checkDatabase')
    @HealthCheck()
    @ApiKeySystemProtected()
    @Get('/database')
    async checkDatabase(): Promise<IResponse<HealthDatabaseResponseDto>> {
        const data = await this.health.check([
            () =>
                this.mongooseIndicator.pingCheck('database', {
                    connection: this.databaseConnection,
                }),
        ]);
        return {
            data,
        };
    }

    @HealthSystemCheckInstanceDoc()
    @Response('health.checkInstance')
    @HealthCheck()
    @ApiKeySystemProtected()
    @Get('/instance')
    async checkInstance(): Promise<IResponse<HealthInstanceResponseDto>> {
        const data = await this.health.check([
            () =>
                this.memoryHealthIndicator.checkRSS(
                    'memoryRss',
                    300 * 1024 * 1024
                ),
            () =>
                this.memoryHealthIndicator.checkHeap(
                    'memoryHeap',
                    300 * 1024 * 1024
                ),
            () =>
                this.diskHealthIndicator.checkStorage('storage', {
                    thresholdPercent: 0.75,
                    path: '/',
                }),
        ]);

        return {
            data,
        };
    }
}
