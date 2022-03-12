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
import { AwsHealthIndicator } from './indicator/health.aws.indicator';
@Controller({
    version: VERSION_NEUTRAL,
    path: 'health',
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

    @Get('/')
    @HealthCheck()
    check() {
        return this.health.check([
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
    }
}
