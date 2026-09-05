import { DatabaseClientFactory } from '@common/database/factories/database.client.factory';

export type IDatabaseClient = ReturnType<DatabaseClientFactory['create']>;

// Derived from IDatabaseClient: Prisma.TransactionClient does not carry this
// client's extensions and will not match it.
export type IDatabaseTransactionClient = Parameters<
    Parameters<IDatabaseClient['$transaction']>[0]
>[0];
