import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import {
    DiskHealthIndicator,
    HealthCheck,
    HealthCheckService,
    MemoryHealthIndicator,
    MongooseHealthIndicator,
} from '@nestjs/terminus';
import { Connection } from 'mongoose';
import { DatabaseConnection } from 'src/database/database.decorator';
import { DebuggerService } from 'src/debugger/debugger.service';
import { AwsHealthIndicator } from '../indicator/health.aws.indicator';
import { ENUM_HEALTH_STATUS_CODE_ERROR } from '../health.constant';
import { IResponse } from 'src/utils/response/response.interface';
import { Response } from 'src/utils/response/response.decorator';
import { SuccessException } from 'src/utils/error/error.exception';
@Controller({
    version: VERSION_NEUTRAL,
    path: 'health',
})
export class HealthCommonController {
    constructor(
        private readonly debuggerService: DebuggerService,
        @DatabaseConnection() private readonly databaseConnection: Connection,
        private readonly health: HealthCheckService,
        private readonly memoryHealthIndicator: MemoryHealthIndicator,
        private readonly diskHealthIndicator: DiskHealthIndicator,
        private readonly databaseIndicator: MongooseHealthIndicator,
        private readonly awsIndicator: AwsHealthIndicator
    ) {}

    @Response('health.check')
    @HealthCheck()
    @Get('/')
    async check(): Promise<IResponse> {
        try {
            const health = await this.health.check([
                () => this.awsIndicator.isHealthy('aws bucket'),
                // the process should not use more than 300MB memory
                () =>
                    this.memoryHealthIndicator.checkHeap(
                        'memory heap',
                        300 * 1024 * 1024
                    ),
                // The process should not have more than 300MB RSS memory allocated
                () =>
                    this.memoryHealthIndicator.checkRSS(
                        'memory RSS',
                        300 * 1024 * 1024
                    ),
                // the used disk storage should not exceed the 75% of the available space
                () =>
                    this.diskHealthIndicator.checkStorage('disk health', {
                        thresholdPercent: 0.75,
                        path: '/',
                    }),
                () =>
                    this.databaseIndicator.pingCheck('database', {
                        connection: this.databaseConnection,
                    }),
            ]);

            return health;
        } catch (err) {
            this.debuggerService.error(
                'Health try catch',
                'HealthController',
                'check',
                err
            );

            throw new SuccessException({
                statusCode:
                    ENUM_HEALTH_STATUS_CODE_ERROR.HEALTH_UNHEALTHY_ERROR,
                message: 'health.error.check',
                data: err.response,
            });
        }
    }
}
