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

    async onModuleInit(): Promise<void> {
        try {
            await this.setupLogging();
            await this.connect();
        } catch (error: unknown) {
            this.logger.error(error, 'Failed to initialize database service');
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
            this.logger.error(error, 'Failed to connect to the database');
            throw error;
        }
    }

    private async disconnect(): Promise<void> {
        try {
            await this.$disconnect();
            this.logger.log('Successfully disconnected from the database');
        } catch (error: unknown) {
            this.logger.error(error, 'Failed to disconnect from the database');
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

    private logError(event: Prisma.LogEvent): void {
        this.logger.error(event, 'A Prisma error occurred');
    }

    private logWarn(event: Prisma.LogEvent): void {
        this.logger.warn(event, 'A Prisma warning occurred');
    }

    private logInfo(event: Prisma.LogEvent): void {
        this.logger.log(event, 'A Prisma info event occurred');
    }
}
