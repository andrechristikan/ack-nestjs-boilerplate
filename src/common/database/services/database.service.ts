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

    private async disconnect(): Promise<void> {
        try {
            await this.client.$disconnect();
            this.logger.log('Successfully disconnected from the database');
        } catch (error: unknown) {
            this.logger.error(error, 'Failed to disconnect from the database');
        }
    }

    private async setupLogging(): Promise<void> {
        if (this.isDebugMode) {
            this.databaseClientFactory.$on('query', this.logQuery.bind(this));
            this.databaseClientFactory.$on('error', this.logError.bind(this));
            this.databaseClientFactory.$on('warn', this.logWarn.bind(this));
            this.databaseClientFactory.$on('info', this.logInfo.bind(this));
        }
    }

    private describeQuery(event: Prisma.QueryEvent): IDatabaseQueryLog {
        const match = DatabaseQueryTargetRegex.exec(event.query);

        return {
            model: match?.[1] ?? null,
            action: match?.[2] ?? null,
            duration: event.duration,
        };
    }

    private logQuery(event: Prisma.QueryEvent): void {
        const queryLog = this.describeQuery(event);

        this.logger.verbose(queryLog, 'A Prisma query was executed');
    }

    private logError(event: Prisma.LogEvent): void {
        this.logger.error(event, 'A Prisma error occurred');
    }

    private logWarn(event: Prisma.LogEvent): void {
        this.logger.warn(event, 'A Prisma warning occurred');
    }

    private logInfo(event: Prisma.LogEvent): void {
        this.logger.log(event, 'A Prisma info event occurred');
    }

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

    async onModuleDestroy(): Promise<void> {
        await this.disconnect();
    }

    async withTransaction<T>(
        fn: (tx: IDatabaseTransactionClient) => Promise<T>,
        options?: IDatabaseTransactionOptions
    ): Promise<T> {
        return this.client.$transaction(async tx => fn(tx), options);
    }
}
