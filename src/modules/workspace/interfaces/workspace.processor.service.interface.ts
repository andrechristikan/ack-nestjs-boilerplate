import { IQueueResponse } from '@queues/interfaces/queue.interface';

export interface IWorkspaceProcessorService {
    processExpireStaleInvites(): Promise<IQueueResponse>;
}
