import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import {
    DiskHealthIndicator,
    HealthCheck,
    HealthCheckService,
    MemoryHealthIndicator,
    MongooseHealthIndicator,
    TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { ApiKeyProtected } from 'src/common/api-key/decorators/api-key.decorator';
import { ENUM_DATABASE_TYPE } from 'src/common/database/constants/database.enum';
import {
    RequestValidateTimestamp,
    RequestValidateUserAgent,
} from 'src/common/request/decorators/request.decorator';
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
        private readonly typeormIndicator: TypeOrmHealthIndicator,
        private readonly awsIndicator: HealthAwsIndicator,
        private readonly configService: ConfigService
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
        if (
            this.configService.get<ENUM_DATABASE_TYPE>('database.type') ===
            ENUM_DATABASE_TYPE.MONGO
        ) {
            return this.health.check([
                () => this.mongooseIndicator.pingCheck('database'),
            ]);
        }

        return this.health.check([
            () => this.typeormIndicator.pingCheck('database'),
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
