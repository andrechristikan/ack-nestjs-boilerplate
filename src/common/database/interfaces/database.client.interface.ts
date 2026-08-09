import { DatabaseClientFactory } from '@common/database/factories/database.client.factory';

export type IDatabaseClient = ReturnType<DatabaseClientFactory['create']>;

// @note: Prisma.TransactionClient doesn't match this extended client; derive tx type from IDatabaseClient instead.
export type IDatabaseTransactionClient = Parameters<
    Parameters<IDatabaseClient['$transaction']>[0]
>[0];
