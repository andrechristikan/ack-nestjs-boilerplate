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
        const srv = this.configService.get<boolean>('database.srv');
        const admin = this.configService.get<boolean>('database.admin');
        const options = this.configService.get<string>('database.options')
            ? `?${this.configService.get<string>('database.options')}`
            : '';

        let uri: string = `mongodb${srv ? '+srv' : ''}://`;
        if (
            this.configService.get<string>('database.user') &&
            this.configService.get<string>('database.password')
        ) {
            uri = `${uri}${this.configService.get<string>(
                'database.user'
            )}:${this.configService.get<string>('database.password')}@`;
        }

        uri = `${uri}${baseUrl}/${databaseName}${options}`;
        mongoose.set('debug', this.configService.get<string>('app.debug'));

        const mongooseOptions: MongooseModuleOptions = {
            uri,
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true,
            useFindAndModify: false
        };

        if (admin) {
            mongooseOptions.authSource = 'admin';
            mongooseOptions.ssl = true;
        }

        return mongooseOptions;
    }
}
