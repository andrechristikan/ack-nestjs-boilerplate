import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicatorResult } from '@nestjs/terminus';
import { Prisma, PrismaClient } from '@prisma/client';
import { IDatabaseService } from 'src/common/database/interfaces/database.service.interface';

/**
 * Database service that extends PrismaClient with additional functionality
 * Handles database connections, health checks, and logging
 */
@Injectable()
export class DatabaseService
    extends PrismaClient<
        Prisma.PrismaClientOptions,
        'query' | 'error' | 'warn' | 'info'
    >
    implements OnModuleInit, IDatabaseService, OnModuleDestroy
{
    private readonly logger: Logger = new Logger(DatabaseService.name);
    private readonly isDebugMode: boolean;

    constructor(private readonly configService: ConfigService) {
        super({
            log: [
                { emit: 'event', level: 'query' },
                { emit: 'event', level: 'error' },
                { emit: 'event', level: 'warn' },
                { emit: 'event', level: 'info' },
            ],
            errorFormat: 'pretty',
        });

        this.isDebugMode = this.configService.get<boolean>('database.debug');
    }

    /**
     * Health check method to verify database connectivity
     */
    async isHealthy(): Promise<HealthIndicatorResult> {
        try {
            await this.$runCommandRaw({ ping: 1 });
            return {
                database: {
                    status: 'up',
                },
            };
        } catch (error) {
            return {
                database: {
                    status: 'down',
                    error: error.message,
                },
            };
        }
    }

    async onModuleInit(): Promise<void> {
        try {
            await this.setupLogging();
            await this.connect();
        } catch (error: unknown) {
            this.logger.error('Failed to initialize database service', error);
            throw error;
        }
    }

    async onModuleDestroy(): Promise<void> {
        await this.disconnect();
    }

    private async connect(): Promise<void> {
        try {
            await this.$connect();
            this.logger.log('Successfully connected to the database');
        } catch (error: unknown) {
            this.logger.error('Failed to connect to the database', error);
            throw error;
        }
    }

    private async disconnect(): Promise<void> {
        try {
            await this.$disconnect();
            this.logger.log('Successfully disconnected from the database');
        } catch (error: unknown) {
            this.logger.error('Failed to disconnect from the database', error);
            throw error;
        }
    }

    private async setupLogging(): Promise<void> {
        if (this.isDebugMode) {
            this.$on('query', this.logQuery.bind(this));
            this.$on('error', this.logError.bind(this));
            this.$on('warn', this.logWarn.bind(this));
            this.$on('info', this.logInfo.bind(this));
        }
    }

    private logQuery(event: Prisma.QueryEvent): void {
        this.logger.debug(
            `Query [${event.timestamp}] : ${event.query} | Params: ${event.params} | Duration: ${event.duration}ms`
        );
    }

    private logError(event: Prisma.LogEvent): void {
        this.logger.error('Error', event.message);
    }

    private logWarn(event: Prisma.LogEvent): void {
        this.logger.warn('Warning', event.message);
    }

    private logInfo(event: Prisma.LogEvent): void {
        this.logger.log('Info', event.message);
    }
}
