import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicatorResult } from '@nestjs/terminus';
import { Prisma, PrismaClient } from '@generated/prisma-client';
import { IDatabaseService } from '@common/database/interfaces/database.service.interface';

/**
 * Prisma-based database service with NestJS lifecycle integration.
 *
 * Extends PrismaClient to provide connection management, health-check support,
 * and configurable query/error logging. All Prisma events are wired up as
 * event-emitter listeners so they can be toggled via the `database.debug` config flag.
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

        this.isDebugMode = this.configService.get<boolean>('database.debug')!;
        this.prettier = this.configService.get<boolean>('logger.prettier')!;
    }

    /**
     * Pings the database and returns a Terminus health indicator result.
     *
     * @returns {Promise<HealthIndicatorResult>} Object keyed by `"database"` with status `"up"` or `"down"`
     */
    async isHealthy(): Promise<HealthIndicatorResult> {
        try {
            await this.$runCommandRaw({ ping: 1 });
            return {
                database: {
                    status: 'up',
                },
            };
        } catch (error: unknown) {
            return {
                database: {
                    status: 'down',
                    error:
                        error instanceof Error ? error.message : String(error),
                },
            };
        }
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
            this.logger.error(error, 'Failed to initialize database service');
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

    /**
     * Opens the Prisma database connection and logs the result.
     *
     * @throws {Error} When the underlying `$connect` call fails
     * @returns {Promise<void>}
     */
    private async connect(): Promise<void> {
        try {
            await this.$connect();
            this.logger.log('Successfully connected to the database');
        } catch (error: unknown) {
            this.logger.error(error, 'Failed to connect to the database');
            throw error;
        }
    }

    /**
     * Closes the Prisma database connection and logs the result.
     *
     * @throws {Error} When the underlying `$disconnect` call fails
     * @returns {Promise<void>}
     */
    private async disconnect(): Promise<void> {
        try {
            await this.$disconnect();
            this.logger.log('Successfully disconnected from the database');
        } catch (error: unknown) {
            this.logger.error(error, 'Failed to disconnect from the database');
            throw error;
        }
    }

    /**
     * Registers Prisma event listeners when debug mode is enabled.
     *
     * Binds handlers for `query`, `error`, `warn`, and `info` Prisma events.
     * No-ops when `database.debug` config is false.
     *
     * @returns {Promise<void>}
     */
    private async setupLogging(): Promise<void> {
        if (this.isDebugMode) {
            this.$on('query', this.logQuery.bind(this));
            this.$on('error', this.logError.bind(this));
            this.$on('warn', this.logWarn.bind(this));
            this.$on('info', this.logInfo.bind(this));
        }
    }

    /**
     * Logs a Prisma query event at verbose level.
     *
     * When `logger.prettier` is enabled, sanitizes escape sequences and
     * collapses whitespace before logging. Marks queries exceeding 1 000 ms
     * as slow via the `slowQuery` flag.
     *
     * @param {Prisma.QueryEvent} event - The Prisma query event emitted by PrismaClient
     */
    private logQuery(event: Prisma.QueryEvent): void {
        const { query, duration, params, ...other } = event;
        if (this.prettier) {
            let sanitizedQuery: string = query;
            if (typeof sanitizedQuery === 'string') {
                sanitizedQuery = sanitizedQuery
                    .replaceAll(/\\"/g, '"')
                    .replaceAll(/\\\\/g, '\\')
                    .replaceAll(/\\n/g, '\n')
                    .replaceAll(/\s+/g, ' ')
                    .trim();
            }

            const message = `[Prisma Query] ${duration}ms - ${sanitizedQuery}${params !== '[]' ? ` | Params: ${params}` : ''}`;

            this.logger.verbose(
                {
                    ...other,
                    message,
                    params,
                    duration,
                    slowQuery: duration > 1000,
                },
                'A Prisma query was executed'
            );
        } else {
            this.logger.verbose(
                {
                    ...other,
                    message: query,
                    params,
                    duration,
                    slowQuery: duration > 1000,
                },
                'A Prisma query was executed'
            );
        }
    }

    /**
     * Logs a Prisma error event at error level.
     *
     * @param {Prisma.LogEvent} event - The Prisma error event emitted by PrismaClient
     */
    private logError(event: Prisma.LogEvent): void {
        this.logger.error(event, 'A Prisma error occurred');
    }

    /**
     * Logs a Prisma warning event at warn level.
     *
     * @param {Prisma.LogEvent} event - The Prisma warning event emitted by PrismaClient
     */
    private logWarn(event: Prisma.LogEvent): void {
        this.logger.warn(event, 'A Prisma warning occurred');
    }

    /**
     * Logs a Prisma info event at log level.
     *
     * @param {Prisma.LogEvent} event - The Prisma info event emitted by PrismaClient
     */
    private logInfo(event: Prisma.LogEvent): void {
        this.logger.log(event, 'A Prisma info event occurred');
    }
}
