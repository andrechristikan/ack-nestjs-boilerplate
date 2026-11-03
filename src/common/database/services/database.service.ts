import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@generated/prisma-client/client';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import {
    DatabaseClientToken,
    DatabaseQueryTargetRegex,
} from '@common/database/constants/database.constant';
import { DatabaseClientFactory } from '@common/database/factories/database.client.factory';
import type {
    IDatabaseClient,
    IDatabaseQueryLog,
    IDatabaseTransactionClient,
    IDatabaseTransactionOptions,
} from '@common/database/interfaces/database.client.interface';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
    private readonly logger: Logger = new Logger(DatabaseService.name);
    private readonly isDebugMode: boolean;
    readonly client: IDatabaseClient;

    constructor(
        private readonly configService: ConfigService,
        private readonly databaseClientFactory: DatabaseClientFactory,
        @Inject(DatabaseClientToken)
        private readonly databaseClient: IDatabaseClient
    ) {
        this.isDebugMode = this.configService.get<boolean>('database.debug')!;
        this.client = this.databaseClient;
    }

    /**
     * Opens the connection and throws on failure, so boot fails loudly rather than serving a
     * process with no database.
     */
    private async connect(): Promise<void> {
        try {
            await this.client.$connect();
            this.logger.log('Successfully connected to the database');
        } catch (error: unknown) {
            throw new AppUnknownException(
                error,
                'Connecting to the database failed'
            );
        }
    }

    /**
     * Closes the connection. A failure is logged and swallowed, because throwing here would abort
     * the shutdown sequence and leave the process alive with its signal handlers already consumed.
     */
    private async disconnect(): Promise<void> {
        try {
            await this.client.$disconnect();
            this.logger.log('Successfully disconnected from the database');
        } catch (error: unknown) {
            this.logger.error(error, 'Failed to disconnect from the database');
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
     * Reads the collection and operation off a query event; the statement text and its params carry
     * filter values, so neither is kept.
     */
    private describeQuery(event: Prisma.QueryEvent): IDatabaseQueryLog {
        const match = DatabaseQueryTargetRegex.exec(event.query);

        return {
            model: match?.[1] ?? null,
            action: match?.[2] ?? null,
            duration: event.duration,
        };
    }

    /**
     * Logs the model, action, and duration of one query at verbose level.
     */
    private logQuery(event: Prisma.QueryEvent): void {
        const queryLog = this.describeQuery(event);

        this.logger.verbose(queryLog, 'A Prisma query was executed');
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

    /**
     * Registers the log handlers before connecting, so a failure during connect is already logged.
     */
    async onModuleInit(): Promise<void> {
        try {
            // Sequential by design: side effects whose order is part of the contract
            await this.setupLogging();
            await this.connect();
        } catch (error: unknown) {
            if (error instanceof AppBaseException) {
                throw error;
            }

            throw new AppUnknownException(
                error,
                'Initializing the database service failed'
            );
        }
    }

    /**
     * Closes the connection on shutdown.
     */
    async onModuleDestroy(): Promise<void> {
        await this.disconnect();
    }

    /**
     * Opens a Prisma interactive transaction and runs `fn` on the tx-bound client; omitted `options` use Prisma's defaults (`maxWait` 2 s, `timeout` 5 s).
     */
    async withTransaction<T>(
        fn: (tx: IDatabaseTransactionClient) => Promise<T>,
        options?: IDatabaseTransactionOptions
    ): Promise<T> {
        return this.client.$transaction(async tx => fn(tx), options);
    }
}
