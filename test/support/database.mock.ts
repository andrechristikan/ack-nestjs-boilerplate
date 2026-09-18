import { createMock } from '@golevelup/ts-vitest';
import { vi } from 'vitest';

import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';

export function createDatabaseServiceMock(): DatabaseService {
    const databaseService = createMock<DatabaseService>();
    mockDatabaseServiceTransaction(databaseService);

    return databaseService;
}

export function mockDatabaseServiceTransaction(
    databaseService: DatabaseService
): void {
    const transactionClient = {} as IDatabaseTransactionClient;

    const withTransaction = vi.fn(
        async (
            callback: (client: IDatabaseTransactionClient) => Promise<unknown>
        ) => callback(transactionClient)
    );

    Object.defineProperty(databaseService, 'withTransaction', {
        configurable: true,
        value: withTransaction,
    });
}
