import { IQueueResponse } from '@queues/interfaces/queue.interface';

export interface INotificationPushMaintenanceService {
    processCleanupTokens(
        userId: string,
        failureTokens: string[]
    ): Promise<IQueueResponse>;
    processCleanupStaleTokens(): Promise<IQueueResponse>;
}
