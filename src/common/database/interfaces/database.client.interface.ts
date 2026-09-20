import type { Prisma } from '@generated/prisma-client/client';
import { DatabaseClientFactory } from '@common/database/factories/database.client.factory';

export interface IDatabaseClientOptions extends Prisma.PrismaClientOptions {
    log: Prisma.LogDefinition[];
}

export type IDatabaseClient = ReturnType<DatabaseClientFactory['create']>;

// Derived from IDatabaseClient: Prisma.TransactionClient does not carry this
// client's extensions and will not match it.
export type IDatabaseTransactionClient = Parameters<
    Parameters<IDatabaseClient['$transaction']>[0]
>[0];

export type IDatabaseTransactionOptions = NonNullable<
    Prisma.PrismaClientOptions['transactionOptions']
>;
