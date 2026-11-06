import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@generated/prisma-client/client';
import type {
    IDatabaseClient,
    IDatabaseClientOptions,
} from '@common/database/interfaces/database.client.interface';
import { DatabaseExtensionFactory } from '@common/database/factories/database.extension.factory';

@Injectable()
export class DatabaseClientFactory extends PrismaClient<
    IDatabaseClientOptions,
    'query' | 'error' | 'warn' | 'info'
> {
    constructor(
        private readonly databaseExtensionFactory: DatabaseExtensionFactory
    ) {
        super({
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

        return this.$extends(extension);
    }
}
