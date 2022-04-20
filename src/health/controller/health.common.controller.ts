import {
    Controller,
    Get,
    InternalServerErrorException,
    VERSION_NEUTRAL,
} from '@nestjs/common';
import {
    DiskHealthIndicator,
    HealthCheck,
    HealthCheckService,
    MemoryHealthIndicator,
    MongooseHealthIndicator,
} from '@nestjs/terminus';
import { Connection } from 'mongoose';
import { DatabaseConnection } from 'src/database/database.decorator';
import { AwsHealthIndicator } from '../indicator/health.aws.indicator';
import { IResponse } from 'src/utils/response/response.interface';
import { Response } from 'src/utils/response/response.decorator';
import { ENUM_STATUS_CODE_ERROR } from 'src/utils/error/error.constant';

@Controller({
    version: VERSION_NEUTRAL,
    path: 'health',
})
export class HealthCommonController {
    constructor(
        @DatabaseConnection() private readonly databaseConnection: Connection,
        private readonly health: HealthCheckService,
        private readonly memoryHealthIndicator: MemoryHealthIndicator,
        private readonly diskHealthIndicator: DiskHealthIndicator,
        private readonly databaseIndicator: MongooseHealthIndicator,
        private readonly awsIndicator: AwsHealthIndicator
    ) {}

    @Response('health.check')
    @HealthCheck()
    @Get('/aws')
    async checkAws(): Promise<IResponse> {
        try {
            return this.health.check([
                () => this.awsIndicator.isHealthy('aws bucket'),
            ]);
        } catch (e) {
            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError',
            });
        }
    }

    @Response('health.check')
    @HealthCheck()
    @Get('/database')
    async checkDatabase(): Promise<IResponse> {
        try {
            return this.health.check([
                () =>
                    this.databaseIndicator.pingCheck('database', {
                        connection: this.databaseConnection,
                    }),
            ]);
        } catch (e) {
            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError',
            });
        }
    }

    @Response('health.check')
    @HealthCheck()
    @Get('/memory-heap')
    async checkMemoryHeap(): Promise<IResponse> {
        try {
            return this.health.check([
                () =>
                    this.memoryHealthIndicator.checkHeap(
                        'memory heap',
                        300 * 1024 * 1024
                    ),
            ]);
        } catch (e) {
            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError',
            });
        }
    }

    @Response('health.check')
    @HealthCheck()
    @Get('/memory-rss')
    async checkMemoryRss(): Promise<IResponse> {
        try {
            return this.health.check([
                () =>
                    this.memoryHealthIndicator.checkRSS(
                        'memory RSS',
                        300 * 1024 * 1024
                    ),
            ]);
        } catch (e) {
            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError',
            });
        }
    }

    @Response('health.check')
    @HealthCheck()
    @Get('/storage')
    async checkStorage(): Promise<IResponse> {
        try {
            return this.health.check([
                () =>
                    this.diskHealthIndicator.checkStorage('disk health', {
                        thresholdPercent: 0.75,
                        path: '/',
                    }),
            ]);
        } catch (e) {
            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError',
            });
        }
    }

    @Response('health.check')
    @HealthCheck()
    @Get('/database')
    async check(): Promise<IResponse> {
        try {
            return this.health.check([
                () =>
                    this.databaseIndicator.pingCheck('database', {
                        connection: this.databaseConnection,
                    }),
            ]);
        } catch (e) {
            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError',
            });
        }
    }
}
