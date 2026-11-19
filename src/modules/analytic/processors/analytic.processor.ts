import { QueueProcessorBase } from '@common/queue/bases/queue.processor.base';
import { QueueProcessor } from '@common/queue/decorators/queue.decorator';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import {
    EnumAnalyticProcess,
    EnumAnalyticQueue,
} from '@modules/analytic/enums/analytic.enum';
import type { IAnalyticRefreshSnapshotPayload } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticProcessRefreshSnapshotUseCase } from '@modules/analytic/use-cases/analytic.process-refresh-snapshot.use-case';
import { Job } from 'bullmq';

@QueueProcessor(EnumAnalyticQueue.analytic)
export class AnalyticProcessor extends QueueProcessorBase {
    constructor(
        private readonly analyticProcessRefreshSnapshotUseCase: AnalyticProcessRefreshSnapshotUseCase
    ) {
        super();
    }

    protected async handle(
        job: Job<unknown, IQueueResponse, EnumAnalyticProcess>,
        data: unknown
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumAnalyticProcess.refreshSnapshot:
                return await this.analyticProcessRefreshSnapshotUseCase.execute(
                    data as IAnalyticRefreshSnapshotPayload
                );
            default:
                this.throwUnknownProcess(
                    'analytic.queue.error.unknownProcess',
                    job.name
                );
        }
    }
}
