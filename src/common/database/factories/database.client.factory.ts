import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@generated/prisma-client';
import { DatabaseExtensionUtil } from '@common/database/utils/database.extension.util';

@Injectable()
export class DatabaseClientFactory extends PrismaClient<
    Prisma.PrismaClientOptions,
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

    /**
     * Applies the audit extension to this connection. The return type stays inferred because
     * annotating it erases the softDelete and restore model methods, so `IDatabaseClient` reads it
     * back with `ReturnType`; the lint exception is `ts/database-inferred-client` in `eslint.config.mjs`.
     */
    create() {
        return this.$extends(this.databaseExtensionUtil.build());
    }
}
