import {
    Inject,
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@generated/prisma-client';
import { DatabaseClientToken } from '@common/database/constants/database.constant';
import { DatabaseClientFactory } from '@common/database/factories/database.client.factory';
import { IDatabaseClient } from '@common/database/interfaces/database.client.interface';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
    private readonly logger: Logger = new Logger(DatabaseService.name);
    private readonly isDebugMode: boolean;
    private readonly prettier: boolean;

    constructor(
        private readonly configService: ConfigService,
        private readonly databaseClientFactory: DatabaseClientFactory,
        @Inject(DatabaseClientToken) readonly client: IDatabaseClient
    ) {
        this.isDebugMode = this.configService.get<boolean>('database.debug')!;
        this.prettier = this.configService.get<boolean>('logger.prettier')!;
    }

    /**
     * Registers the log handlers before connecting, so a failure during connect is already logged.
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
     * Closes the connection on shutdown.
     */
    async onModuleDestroy(): Promise<void> {
        await this.disconnect();
    }

    /**
     * Opens the connection and rethrows on failure, so boot fails loudly rather than serving a
     * process with no database.
     */
    private async connect(): Promise<void> {
        try {
            await this.client.$connect();
            this.logger.log('Successfully connected to the database');
        } catch (error: unknown) {
            this.logger.error(error, 'Failed to connect to the database');
            throw error;
        }
    }

    /**
     * Closes the connection.
     */
    private async disconnect(): Promise<void> {
        try {
            await this.client.$disconnect();
            this.logger.log('Successfully disconnected from the database');
        } catch (error: unknown) {
            this.logger.error(error, 'Failed to disconnect from the database');
            throw error;
        }
    }

    /**
     * Subscribes to Prisma log events, only in debug mode. Registered on the raw factory instance
     * because an extended client does not expose `$on`.
     */
    private async setupLogging(): Promise<void> {
        if (this.isDebugMode) {
            this.databaseClientFactory.$on('query', this.logQuery.bind(this));
            this.databaseClientFactory.$on('error', this.logError.bind(this));
            this.databaseClientFactory.$on('warn', this.logWarn.bind(this));
            this.databaseClientFactory.$on('info', this.logInfo.bind(this));
        }
    }

    /**
     * Logs one query at verbose level, unescaping and collapsing the SQL when prettier mode is on,
     * and flagging anything over a second as a slow query.
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
     * Logs a Prisma error event.
     */
    private logError(event: Prisma.LogEvent): void {
        this.logger.error(event, 'A Prisma error occurred');
    }

    /**
     * Logs a Prisma warning event.
     */
    private logWarn(event: Prisma.LogEvent): void {
        this.logger.warn(event, 'A Prisma warning occurred');
    }

    /**
     * Logs a Prisma info event.
     */
    private logInfo(event: Prisma.LogEvent): void {
        this.logger.log(event, 'A Prisma info event occurred');
    }
}
