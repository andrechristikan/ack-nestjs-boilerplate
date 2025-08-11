import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';
import { IDatabaseOptionService } from '@common/database/interfaces/database.option-service.interface';

/**
 * Database configuration options service.
 *
 * Handles MongoDB/Mongoose connection configuration including connection strings,
 * timeout settings, connection pool options, and debug mode based on environment.
 * Provides optimized settings for different deployment environments.
 */
@Injectable()
export class DatabaseOptionService implements IDatabaseOptionService {
    private readonly logger = new Logger(DatabaseOptionService.name);

    private readonly slowQueryThreshold: number;
    private readonly sampleRate: number;
    private readonly env: string;
    private readonly name: string;
    private readonly url: string;
    private readonly timeoutOptions: Record<string, number>;
    private readonly poolOptions: Record<string, number>;
    private readonly debug: boolean;

    constructor(private readonly configService: ConfigService) {
        this.slowQueryThreshold = this.configService.get<number>(
            'database.slowQueryThreshold'
        );
        this.sampleRate = this.configService.get<number>('database.sampleRate');
        this.env = this.configService.get<string>('app.env');
        this.name = this.configService.get<string>('app.name');
        this.url = this.configService.get<string>('database.url');
        this.timeoutOptions = this.configService.get<Record<string, number>>(
            'database.timeoutOptions'
        );
        this.poolOptions = this.configService.get<Record<string, number>>(
            'database.poolOptions'
        );
        this.debug = this.configService.get<boolean>('database.debug');
    }

    async createOptions(): Promise<MongooseModuleOptions> {
        let timeoutOptions = this.timeoutOptions;
        let poolOptions = this.poolOptions;

        if (this.env === ENUM_APP_ENVIRONMENT.MIGRATION) {
            // make timeout and pool options 2 times longer
            timeoutOptions = {
                serverSelectionTimeoutMS: 60 * 1000, // 60 secs
                socketTimeoutMS: 300 * 1000, // 5 minutes
                heartbeatFrequencyMS: 10 * 1000, // 10 secs
            };

            poolOptions = {
                maxPoolSize: 20,
                minPoolSize: 5,
                maxIdleTimeMS: 120000, // Increased from 60000
                waitQueueTimeoutMS: 60000, // Increased from 30000
            };
        }

        this.setDebugMode();
        this.setup();

        this.logger.log(
            `Database connection options for environment "${this.env}": ${JSON.stringify(
                {
                    url: this.url,
                    timeoutOptions,
                    poolOptions,
                }
            )}`
        );

        const mongooseOptions: MongooseModuleOptions = {
            uri: this.url,
            autoCreate: this.env === ENUM_APP_ENVIRONMENT.MIGRATION,
            autoIndex: this.env === ENUM_APP_ENVIRONMENT.MIGRATION,
            appName: this.name,
            retryWrites: true,
            retryReads: true,
            ...timeoutOptions,
            ...poolOptions,
        };

        return mongooseOptions;
    }

    private setDebugMode(): void {
        this.logger.log(
            `Setting Database debug mode to ${this.debug ? 'enabled' : 'disabled'}`
        );

        mongoose.set('debug', (collectionName, method, ...methodArgs) => {
            if (!this.debug) {
                return;
            }

            this.logger.debug(
                `${collectionName}.${method} - ${JSON.stringify(methodArgs)}`
            );
        });
    }

    private setup(): void {
        mongoose.connection.on('connected', () => {
            this.setupProfiler();
        });
    }

    private async setupProfiler(): Promise<void> {
        this.logger.log(
            `Setting up MongoDB profiler with slowQueryThreshold: ${this.slowQueryThreshold}ms and sampleRate: ${this.sampleRate}`
        );

        const command = {
            profile: 1,
            slowms: this.slowQueryThreshold,
            sampleRate: this.sampleRate,
        };

        await mongoose.connection.db.command(command);

        this.logger.log(
            `Profiler setup complete with command: ${JSON.stringify(command)}`
        );
    }
}
