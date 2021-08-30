import { Injectable } from '@nestjs/common';
import {
    MongooseOptionsFactory,
    MongooseModuleOptions
} from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class DatabaseService implements MongooseOptionsFactory {
    constructor(private readonly configService: ConfigService) {}

    createMongooseOptions(): MongooseModuleOptions {
        const baseUrl = `${this.configService.get<string>('database.host')}`;
        const databaseName = this.configService.get<string>('database.name');
        const srv = this.configService.get<string>('database.srv');
        const options = this.configService.get<string>('database.options');

        let uri: string = `mongodb${srv ? '+srv' : ''}://`;
        if (
            this.configService.get<string>('database.user') &&
            this.configService.get<string>('database.password')
        ) {
            uri = `${uri}${this.configService.get<string>(
                'database.user'
            )}:${this.configService.get<string>('database.password')}@`;
        }

        uri = `${uri}${baseUrl}/${databaseName}?${options}`;

        mongoose.set('debug', this.configService.get<string>('app.debug'));
        return {
            uri,
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true,
            useFindAndModify: false
        };
    }
}
