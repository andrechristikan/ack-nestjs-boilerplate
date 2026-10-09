import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@generated/prisma-client/client';
import type {
    IDatabaseClient,
    IDatabaseClientOptions,
} from '@common/database/interfaces/database.client.interface';
import { DatabaseExtensionUtil } from '@common/database/utils/database.extension.util';

@Injectable()
export class DatabaseClientFactory extends PrismaClient<
    IDatabaseClientOptions,
    'query' | 'error' | 'warn' | 'info'
> {
    constructor(private readonly databaseExtensionUtil: DatabaseExtensionUtil) {
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

    /** Applies the audit extension to this connection. */
    create(): IDatabaseClient {
        const extension = this.databaseExtensionUtil.build();

        return this.$extends(extension);
    }
}
