import { Injectable, Scope } from '@nestjs/common';
import {
    MongooseOptionsFactory,
    MongooseModuleOptions
} from '@nestjs/mongoose';
import { Config } from 'config/config.decorator';
import { ConfigService } from 'config/config.service';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'middleware/logger/logger.decorator';
import * as mongoose from 'mongoose';

@Injectable({ scope: Scope.TRANSIENT })
export class DatabaseService implements MongooseOptionsFactory {
    constructor(
        @Logger() private readonly logger: LoggerService,
        @Config() private readonly configService: ConfigService
    ) {}

    createMongooseOptions(): MongooseModuleOptions {
        let uri: string = `mongodb://`;
        if (
            this.configService.getEnv('DB_USER') &&
            this.configService.getEnv('DB_PASSWORD')
        ) {
            uri = `${uri}${this.configService.getEnv(
                'DB_USER'
            )}:${this.configService.getEnv('DB_PASSWORD')}@`;
        }

        uri = `${uri}${this.configService.getEnv(
            'DB_HOST'
        )}/${this.configService.getEnv('DB_NAME')}`;

        mongoose.set(
            'debug',
            this.configService.getEnv('APP_DEBUG').toLowerCase() === 'true'
                ? true
                : false
        );
        return {
            uri,
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true
        };
    }
}
