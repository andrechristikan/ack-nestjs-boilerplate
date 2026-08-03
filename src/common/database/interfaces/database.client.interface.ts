import { DatabaseClientFactory } from '@common/database/factories/database.client.factory';

export type IDatabaseClient = ReturnType<DatabaseClientFactory['create']>;
