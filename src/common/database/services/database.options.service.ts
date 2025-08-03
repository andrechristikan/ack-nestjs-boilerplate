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

    constructor(private readonly configService: ConfigService) {}

    async createOptions(): Promise<MongooseModuleOptions> {
        const env = this.configService.get<string>('app.env');
        const name = this.configService.get<string>('app.name');

        const url = this.configService.get<string>('database.url');

        let timeoutOptions = this.configService.get<Record<string, number>>(
            'database.timeoutOptions'
        );

        let poolOptions = this.configService.get<Record<string, number>>(
            'database.poolOptions'
        );

        if (env === ENUM_APP_ENVIRONMENT.MIGRATION) {
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

        this.logger.log(
            `Database connection options for environment "${env}": ${JSON.stringify(
                {
                    url,
                    timeoutOptions,
                    poolOptions,
                }
            )}`
        );

        const mongooseOptions: MongooseModuleOptions = {
            uri: url,
            autoCreate: env === ENUM_APP_ENVIRONMENT.MIGRATION,
            autoIndex: env === ENUM_APP_ENVIRONMENT.MIGRATION,
            appName: name,
            retryWrites: true,
            retryReads: true,
            ...timeoutOptions,
            ...poolOptions,
        };

        return mongooseOptions;
    }

    private setDebugMode(): void {
        const debug = this.configService.get<boolean>('database.debug');

        this.logger.log(
            `Setting Database debug mode to ${debug ? 'enabled' : 'disabled'}`
        );

        mongoose.set('debug', (collectionName, method, ...methodArgs) => {
            if (!debug) {
                return;
            }

            this.logger.log(
                `${collectionName}.${method}`,
                JSON.stringify(methodArgs)
            );
        });
    }
}
