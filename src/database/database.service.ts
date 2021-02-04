import { Injectable } from '@nestjs/common';
import {
    MongooseOptionsFactory,
    MongooseModuleOptions
} from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { DATABASE_URL, DATABASE_NAME } from 'database/database.constant';

@Injectable()
export class DatabaseService implements MongooseOptionsFactory {
    constructor(private readonly configService: ConfigService) {}

    createMongooseOptions(): MongooseModuleOptions {
        // Env Variable
        const baseUrl = `${this.configService.get('database.url') ||
            DATABASE_URL}`;
        const databaseName =
            this.configService.get('database.name') || DATABASE_NAME;

        let uri: string = `mongodb://`;
        if (
            this.configService.get('database.user') &&
            this.configService.get('database.password')
        ) {
            uri = `${uri}${this.configService.get(
                'database.user'
            )}:${this.configService.get('database.password')}@`;
        }

        uri = `${uri}${baseUrl}/${databaseName}`;

        mongoose.set('debug', this.configService.get('app.debug') || false);
        return {
            uri,
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true
        };
    }
}
