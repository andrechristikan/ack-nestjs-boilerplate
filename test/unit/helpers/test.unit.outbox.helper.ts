import type { MockProxy } from 'vitest-mock-extended';
import type { DatabaseService } from '@common/database/services/database.service';

export interface ITestUnitCommitCallbacks {
    beforeCommit: Array<() => Promise<void>>;
    afterCommit: Array<() => Promise<void>>;
}

export function stubCommitCallbacks(
    databaseService: MockProxy<DatabaseService>
): ITestUnitCommitCallbacks {
    const callbacks: ITestUnitCommitCallbacks = {
        beforeCommit: [],
        afterCommit: [],
    };
    databaseService.beforeCommit.mockImplementation((_tx, callback) => {
        callbacks.beforeCommit.push(callback);
    });
    databaseService.afterCommit.mockImplementation((_tx, callback) => {
        callbacks.afterCommit.push(callback);
    });

    return callbacks;
}

export async function runCommitCallbacks(
    callbacks: Array<() => Promise<void>>
): Promise<void> {
    for (const callback of callbacks) {
        await callback();
    }
}
