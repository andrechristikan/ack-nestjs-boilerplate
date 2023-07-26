import { Injectable } from '@nestjs/common';
import { MongooseModuleOptions } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { IDatabaseOptionsService } from 'src/common/database/interfaces/database.options-service.interface';
import { ENUM_APP_ENVIRONMENT } from 'src/app/constants/app.enum.constant';

@Injectable()
export class DatabaseOptionsService implements IDatabaseOptionsService {
    constructor(private readonly configService: ConfigService) {}

    createOptions(): MongooseModuleOptions {
        const env = this.configService.get<string>('app.env');
        const host = this.configService.get<string>('database.host');
        const database = this.configService.get<string>('database.name');
        const user = this.configService.get<string>('database.user');
        const password = this.configService.get<string>('database.password');
        const debug = this.configService.get<boolean>('database.debug');

        const options = this.configService.get<string>('database.options')
            ? `?${this.configService.get<string>('database.options')}`
            : '';

        let uri = `${host}`;

        if (database) {
            uri = `${uri}/${database}${options}`;
        }

        if (env !== ENUM_APP_ENVIRONMENT.PRODUCTION) {
            mongoose.set('debug', debug);
        }

        const mongooseOptions: MongooseModuleOptions = {
            uri,
            serverSelectionTimeoutMS: 5000,
            autoCreate: true,
        };

        if (user && password) {
            mongooseOptions.auth = {
                username: user,
                password: password,
            };
        }

        return mongooseOptions;
    }
}
