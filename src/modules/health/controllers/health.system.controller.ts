import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeySystemProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    HealthSystemCheckAwsDoc,
    HealthSystemCheckDatabaseDoc,
    HealthSystemCheckInstanceDoc,
    HealthSystemCheckThirdPartyDoc,
} from '@modules/health/docs/health.system.doc';
import { HealthAwsResponseDto } from '@modules/health/dtos/response/health.aws.response.dto';
import { HealthDatabaseResponseDto } from '@modules/health/dtos/response/health.database.response.dto';
import { HealthInstanceResponseDto } from '@modules/health/dtos/response/health.instance.response.dto';
import { HealthThirdPartyResponseDto } from '@modules/health/dtos/response/health.third-party.response.dto';
import { HealthAppleIndicator } from '@modules/health/indicators/health.apple.indicator';
import { HealthAwsS3BucketIndicator } from '@modules/health/indicators/health.aws-s3.indicator';
import { HealthAwsSESIndicator } from '@modules/health/indicators/health.aws-ses.indicator';
import { HealthDatabaseIndicator } from '@modules/health/indicators/health.database.indicator';
import { HealthFirebaseIndicator } from '@modules/health/indicators/health.firebase.indicator';
import { HealthGoogleIndicator } from '@modules/health/indicators/health.google.indicator';
import { HealthInstanceIndicator } from '@modules/health/indicators/health.instance.indicator';
import { HealthJwksIndicator } from '@modules/health/indicators/health.jwks.indicator';
import { HealthQueueIndicator } from '@modules/health/indicators/health.queue.indicator';
import { HealthRedisIndicator } from '@modules/health/indicators/health.redis.indicator';
import { HealthSentryIndicator } from '@modules/health/indicators/health.sentry.indicator';
import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

@ApiTags('modules.system.health')
@Controller({
    version: VERSION_NEUTRAL,
    path: '/health',
})
export class HealthSystemController {
    constructor(
        private readonly health: HealthCheckService,
        private readonly healthInstanceIndicator: HealthInstanceIndicator,
        private readonly awsS3BucketIndicator: HealthAwsS3BucketIndicator,
        private readonly awsSESIndicator: HealthAwsSESIndicator,
        private readonly databaseIndicator: HealthDatabaseIndicator,
        private readonly redisIndicator: HealthRedisIndicator,
        private readonly sentryIndicator: HealthSentryIndicator,
        private readonly firebaseIndicator: HealthFirebaseIndicator,
        private readonly googleIndicator: HealthGoogleIndicator,
        private readonly appleIndicator: HealthAppleIndicator,
        private readonly jwksIndicator: HealthJwksIndicator,
        private readonly queueIndicator: HealthQueueIndicator
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
            data: data as HealthAwsResponseDto,
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
            () => this.queueIndicator.isHealthy('queue'),
        ]);
        return {
            data: data as HealthDatabaseResponseDto,
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
            () => this.firebaseIndicator.isHealthy('firebase'),
            () => this.googleIndicator.isHealthy('google'),
            () => this.appleIndicator.isHealthy('apple'),
            () => this.jwksIndicator.isHealthyAccessToken('jwksAccessToken'),
            () => this.jwksIndicator.isHealthyRefreshToken('jwksRefreshToken'),
        ]);
        return {
            data: data as HealthThirdPartyResponseDto,
        };
    }

    @HealthSystemCheckInstanceDoc()
    @Response('health.checkInstance')
    @HealthCheck()
    @ApiKeySystemProtected()
    @Get('/instance')
    async checkInstance(): Promise<IResponseReturn<HealthInstanceResponseDto>> {
        const data = await this.health.check([
            () => this.healthInstanceIndicator.isHealthyMemoryRss('memoryRss'),
            () =>
                this.healthInstanceIndicator.isHealthyMemoryHeap('memoryHeap'),
            () => this.healthInstanceIndicator.isHealthyStorage('storage'),
        ]);

        return {
            data: data as HealthInstanceResponseDto,
        };
    }
}
