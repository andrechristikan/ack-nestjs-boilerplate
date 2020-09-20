import { Injectable, Inject } from '@nestjs/common';
import {
    MongooseOptionsFactory,
    MongooseModuleOptions,
} from '@nestjs/mongoose';
import { ConfigService } from 'common/config/config.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class DatabaseService implements MongooseOptionsFactory {
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        private readonly configService: ConfigService,
    ) {}

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
        this.logger.info(`Database running on ${uri}`);

        return {
            uri,
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true,
        };
    }
}
