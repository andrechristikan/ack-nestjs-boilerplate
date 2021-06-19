import { Injectable } from '@nestjs/common';
import {
    MongooseOptionsFactory,
    MongooseModuleOptions
} from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { DATABASE_HOST, DATABASE_NAME } from 'src/database/database.constant';

@Injectable()
export class DatabaseService implements MongooseOptionsFactory {
    constructor(private readonly configService: ConfigService) {}

    createMongooseOptions(): MongooseModuleOptions {
        // Env Variable
        const baseUrl = `${
            this.configService.get<string>('DATABASE_HOST') || DATABASE_HOST
        }`;
        const databaseName =
            this.configService.get<string>('DATABASE_NAME') || DATABASE_NAME;

        let uri: string = `mongodb://`;
        if (
            this.configService.get<string>('DATABASE_USER') &&
            this.configService.get<string>('DATABASE_PASSWORD')
        ) {
            uri = `${uri}${this.configService.get<string>(
                'DATABASE_USER'
            )}:${this.configService.get<string>('DATABASE_PASSWORD')}@`;
        }

        uri = `${uri}${baseUrl}/${databaseName}`;

        mongoose.set(
            'debug',
            this.configService.get<string>('APP_DEBUG') === 'true'
                ? true
                : false
        );
        return {
            uri,
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true,
            useFindAndModify: false
        };
    }
}
