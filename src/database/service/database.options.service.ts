import { Injectable } from '@nestjs/common';
import {
    MongooseOptionsFactory,
    MongooseModuleOptions,
} from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class DatabaseOptionsService implements MongooseOptionsFactory {
    private readonly host: string;
    private readonly database: string;
    private readonly user: string;
    private readonly password: string;
    private readonly debug: boolean;
    private readonly options: string;
    private readonly env: string;

    constructor(private readonly configService: ConfigService) {
        this.env = this.configService.get<string>('app.env');
        this.host = this.configService.get<string>('database.host');
        this.database = this.configService.get<string>('database.name');
        this.user = this.configService.get<string>('database.user');
        this.password = this.configService.get<string>('database.password');
        this.debug = this.configService.get<boolean>('database.debug');

        /* istanbul ignore next */
        this.options = this.configService.get<string>('database.options')
            ? `?${this.configService.get<string>('database.options')}`
            : '';
    }

    createMongooseOptions(): MongooseModuleOptions {
        let uri = `${this.host}`;

        if (this.database) {
            uri = `${uri}/${this.database}${this.options}`;
        }

        /* istanbul ignore next */
        if (this.env !== 'production') {
            mongoose.set('debug', this.debug);
        }

        const mongooseOptions: MongooseModuleOptions = {
            uri,
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            // useMongoClient: true
        };

        /* istanbul ignore next */
        if (this.user && this.password) {
            mongooseOptions.auth = {
                username: this.user,
                password: this.password,
            };
        }

        return mongooseOptions;
    }
}
