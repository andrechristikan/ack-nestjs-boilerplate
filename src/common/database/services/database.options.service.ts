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

        const url = this.configService.get<string>('database.url');
        const debug = this.configService.get<boolean>('database.debug');

        const timeoutOptions = this.configService.get<Record<string, number>>(
            'database.timeoutOptions'
        );

        if (env !== ENUM_APP_ENVIRONMENT.PRODUCTION) {
            mongoose.set('debug', debug);
        }

        const mongooseOptions: MongooseModuleOptions = {
            uri: url,
            autoCreate: env === ENUM_APP_ENVIRONMENT.MIGRATION,
            autoIndex: env === ENUM_APP_ENVIRONMENT.MIGRATION,
            ...timeoutOptions,
        };

        return mongooseOptions;
    }
}
