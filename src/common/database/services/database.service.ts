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
 * Database service that extends PrismaClient with additional functionality.
 *
 * Handles database connections, health checks, and logging with lifecycle management.
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
    private readonly prettier: boolean;

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
        this.prettier = this.configService.get<boolean>('logger.prettier');
    }

    /**
     * Performs database health check by pinging the database connection.
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

    /**
     * Converts data to a plain object compatible with Prisma JsonObject format.
     *
     * @param {T} data - The data to convert to plain object
     * @returns {Prisma.JsonObject} Plain object representation of the data
     */
    toPlainObject<T>(data: T): Prisma.JsonObject {
        return structuredClone(data) as unknown as Prisma.JsonObject;
    }

    /**
     * Initializes the database service when the module starts.
     * Sets up logging and establishes database connection.
     *
     * @returns {Promise<void>} Promise that resolves when initialization is complete
     */
    async onModuleInit(): Promise<void> {
        try {
            await this.setupLogging();
            await this.connect();
        } catch (error: unknown) {
            this.logger.error('Failed to initialize database service', error);
            throw error;
        }
    }

    /**
     * Cleans up database resources when the module is destroyed.
     * Disconnects from the database.
     *
     * @returns {Promise<void>} Promise that resolves when cleanup is complete
     */
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
        const { query, duration, params, ...other } = event;
        if (this.prettier) {
            let sanitizedQuery: string = query;
            if (typeof sanitizedQuery === 'string') {
                sanitizedQuery = sanitizedQuery
                    .replace(/\\"/g, '"')
                    .replace(/\\\\/g, '\\')
                    .replace(/\\n/g, '\n')
                    .replace(/\s+/g, ' ')
                    .trim();
            }

            const message = `[Prisma Query] ${duration}ms - ${sanitizedQuery}${params !== '[]' ? ` | Params: ${params}` : ''}`;

            this.logger.debug({
                ...other,
                message,
                params,
                duration,
                slowQuery: duration > 1000,
            });
        } else {
            this.logger.debug({
                ...other,
                message: query,
                params,
                duration,
                slowQuery: duration > 1000,
            });
        }
    }

    private logError(event: Prisma.LogEvent): void {
        this.logger.error(event);
    }

    private logWarn(event: Prisma.LogEvent): void {
        this.logger.warn(event);
    }

    private logInfo(event: Prisma.LogEvent): void {
        this.logger.log(event);
    }
}
