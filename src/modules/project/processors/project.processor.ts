import { EnumProjectProcess } from '@modules/project/enums/project.enum';
import type { IProjectSoftDeleteByWorkspacePayload } from '@modules/project/interfaces/project.interface';
import { ProjectProcessSoftDeleteByWorkspaceUseCase } from '@modules/project/use-cases/project.process-soft-delete-by-workspace.use-case';
import { Job } from 'bullmq';
import { QueueProcessorBase } from '@common/queue/bases/queue.processor.base';
import { QueueProcessor } from '@common/queue/decorators/queue.decorator';
import { EnumProjectQueue } from '@modules/project/enums/project.enum';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';

@QueueProcessor(EnumProjectQueue.project)
export class ProjectProcessor extends QueueProcessorBase {
    constructor(
        private readonly projectProcessSoftDeleteByWorkspaceUseCase: ProjectProcessSoftDeleteByWorkspaceUseCase
    ) {
        super();
    }

    protected async handle(
        job: Job<unknown, IQueueResponse, EnumProjectProcess>,
        data: unknown
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumProjectProcess.softDeleteByWorkspace:
                return await this.projectProcessSoftDeleteByWorkspaceUseCase.execute(
                    data as IProjectSoftDeleteByWorkspacePayload
                );
            default:
                this.throwUnknownProcess(
                    'project.queue.error.unknownProcess',
                    job.name
                );
        }
    }
}
