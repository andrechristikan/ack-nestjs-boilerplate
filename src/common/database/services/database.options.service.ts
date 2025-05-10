import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { ENUM_APP_ENVIRONMENT } from 'src/app/enums/app.enum';
import { IDatabaseOptionService } from 'src/common/database/interfaces/database.option-service.interface';

@Injectable()
export class DatabaseOptionService implements IDatabaseOptionService {
    constructor(private readonly configService: ConfigService) {}

    createOptions(): MongooseModuleOptions {
        const env = this.configService.get<string>('app.env');
        const name = this.configService.get<string>('app.name');

        const url = this.configService.get<string>('database.url');
        const debug = this.configService.get<boolean>('database.debug');

        let timeoutOptions = this.configService.get<Record<string, number>>(
            'database.timeoutOptions'
        );

        let poolOptions = this.configService.get<Record<string, number>>(
            'database.poolOptions'
        );

        if (env !== ENUM_APP_ENVIRONMENT.PRODUCTION) {
            mongoose.set('debug', debug);
        }

        if (env === ENUM_APP_ENVIRONMENT.MIGRATION) {
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

        const mongooseOptions: MongooseModuleOptions = {
            uri: url,
            autoCreate: env !== ENUM_APP_ENVIRONMENT.MIGRATION,
            autoIndex: env !== ENUM_APP_ENVIRONMENT.MIGRATION,
            appName: name,
            retryWrites: true,
            retryReads: true,
            ...timeoutOptions,
            ...poolOptions,
        };

        return mongooseOptions;
    }
}
