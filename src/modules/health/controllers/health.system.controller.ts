import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    DiskHealthIndicator,
    HealthCheck,
    HealthCheckService,
    MemoryHealthIndicator,
} from '@nestjs/terminus';
import { ApiKeySystemProtected } from '@modules/api-key/decorators/api-key.decorator';
import { Response } from '@common/response/decorators/response.decorator';
import { HealthAwsResponseDto } from '@modules/health/dtos/response/health.aws.response.dto';
import { HealthDatabaseResponseDto } from '@modules/health/dtos/response/health.database.response.dto';
import {
    HealthSystemCheckAwsDoc,
    HealthSystemCheckDatabaseDoc,
    HealthSystemCheckInstanceDoc,
    HealthSystemCheckThirdPartyDoc,
} from '@modules/health/docs/health.system.doc';
import { HealthInstanceResponseDto } from '@modules/health/dtos/response/health.instance.response.dto';
import { HealthAwsSESIndicator } from '@modules/health/indicators/health.aws-ses.indicator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { HealthAwsS3BucketIndicator } from '@modules/health/indicators/health.aws-s3.indicator';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { HealthDatabaseIndicator } from '@modules/health/indicators/health.database.indicator';
import { HealthRedisIndicator } from '@modules/health/indicators/health.redis.indicator';
import { HealthSentryIndicator } from '@modules/health/indicators/health.sentry.indicator';
import { HealthThirdPartyResponseDto } from '@modules/health/dtos/response/health.sentry.response.dto';

@ApiTags('modules.system.health')
@Controller({
    version: VERSION_NEUTRAL,
    path: '/health',
})
export class HealthSystemController {
    constructor(
        private readonly health: HealthCheckService,
        private readonly memoryHealthIndicator: MemoryHealthIndicator,
        private readonly diskHealthIndicator: DiskHealthIndicator,
        private readonly awsS3BucketIndicator: HealthAwsS3BucketIndicator,
        private readonly awsSESIndicator: HealthAwsSESIndicator,
        private readonly databaseIndicator: HealthDatabaseIndicator,
        private readonly redisIndicator: HealthRedisIndicator,
        private readonly sentryIndicator: HealthSentryIndicator
    ) {}

    @HealthSystemCheckAwsDoc()
    @Response('health.checkAws')
    @HealthCheck()
    @ApiKeySystemProtected()
    @Get('/aws')
    async checkAws(): Promise<IResponseReturn<HealthAwsResponseDto>> {
        const data = await this.health.check([
            () =>
                this.awsS3BucketIndicator.isHealthy(
                    's3PublicBucket',
                    EnumAwsS3Accessibility.public
                ),
            () =>
                this.awsS3BucketIndicator.isHealthy(
                    's3PrivateBucket',
                    EnumAwsS3Accessibility.private
                ),
            () => this.awsSESIndicator.isHealthy('ses'),
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
    async checkDatabase(): Promise<IResponseReturn<HealthDatabaseResponseDto>> {
        const data = await this.health.check([
            () => this.databaseIndicator.isHealthy('database'),
            () => this.redisIndicator.isHealthy('redis'),
        ]);
        return {
            data,
        };
    }

    @HealthSystemCheckThirdPartyDoc()
    @Response('health.checkThirdParty')
    @HealthCheck()
    @ApiKeySystemProtected()
    @Get('/third-party')
    async checkThirdParty(): Promise<
        IResponseReturn<HealthThirdPartyResponseDto>
    > {
        const data = await this.health.check([
            () => this.sentryIndicator.isHealthy('sentry'),
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
    async checkInstance(): Promise<IResponseReturn<HealthInstanceResponseDto>> {
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
