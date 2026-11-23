import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCaslExtension } from '@casl/prisma/runtime';
import { PrismaClient } from '@generated/prisma-client/client';
import type {
    IDatabaseClient,
    IDatabaseClientOptions,
} from '@common/database/interfaces/database.client.interface';
import { DatabaseExtensionFactory } from '@common/database/factories/database.extension.factory';
import { DatabaseUtil } from '@common/database/utils/database.util';

@Injectable()
export class DatabaseClientFactory extends PrismaClient<
    IDatabaseClientOptions,
    'query' | 'error' | 'warn' | 'info'
> {
    constructor(
        protected readonly configService: ConfigService,
        protected readonly databaseUtil: DatabaseUtil,
        private readonly databaseExtensionFactory: DatabaseExtensionFactory
    ) {
        super({
            datasourceUrl: databaseUtil.buildClientUrl(
                configService.get<string>('database.url')!
            ),
            log: [
                { emit: 'event', level: 'query' },
                { emit: 'event', level: 'error' },
                { emit: 'event', level: 'warn' },
                { emit: 'event', level: 'info' },
            ],
            errorFormat: 'pretty',
        });
    }

    create(): IDatabaseClient {
        const extension = this.databaseExtensionFactory.build();

        const extended = this.$extends(extension);

        return extended.$extends(createCaslExtension());
    }
}
