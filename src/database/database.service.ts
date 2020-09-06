import { Injectable } from '@nestjs/common';
import {
    MongooseOptionsFactory,
    MongooseModuleOptions,
} from '@nestjs/mongoose';
import { ConfigService } from 'config/config.service';

@Injectable()
export class DatabaseService implements MongooseOptionsFactory {
    constructor(private readonly configService: ConfigService) {}

    createMongooseOptions(): MongooseModuleOptions {
        let uri = `mongodb://`;
        if (
            this.configService.getEnv('DB_USER') &&
            this.configService.getEnv('DB_PASSWORD')
        ) {
            uri = `${uri}${this.configService.getEnv(
                'DB_USER',
            )}:${this.configService.getEnv('DB_PASSWORD')}@`;
        }

        uri = `${uri}${this.configService.getEnv(
            'DB_HOST',
        )}/${this.configService.getEnv('DB_NAME')}`;
        console.log(`Database running on ${uri}`);

        return {
            uri,
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true,
        };
    }
}
