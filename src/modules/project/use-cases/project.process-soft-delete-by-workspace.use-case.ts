import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import type { IProjectSoftDeleteByWorkspacePayload } from '@modules/project/interfaces/project.interface';
import { ProjectService } from '@modules/project/services/project.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProjectProcessSoftDeleteByWorkspaceUseCase implements IAppUseCase<
    [IProjectSoftDeleteByWorkspacePayload],
    IQueueResponse
> {
    private readonly chunkSize: number;

    constructor(
        private readonly projectService: ProjectService,
        private readonly helperDateService: HelperDateService,
        private readonly messageService: MessageService,
        private readonly configService: ConfigService
    ) {
        this.chunkSize = this.configService.get<number>(
            'project.delete.chunkSize'
        )!;
    }

    async execute(
        data: IProjectSoftDeleteByWorkspacePayload
    ): Promise<IQueueResponse> {
        const { workspaceId, deletedBy } = data;
        const deletedAt = this.helperDateService.createFromIso(data.deletedAt);

        try {
            let count: number;
            do {
                // Sequential by design: a fan-out over an unbounded collection: bounded chunks in turn, each concurrent
                count = await this.projectService.softDeleteChunkByWorkspace(
                    workspaceId,
                    deletedAt,
                    deletedBy
                );
            } while (count === this.chunkSize);
        } catch (error: unknown) {
            const message = this.messageService.setMessage(
                'project.queue.error.softDeleteByWorkspace'
            );

            throw new QueueException(message, true, error);
        }

        const message = this.messageService.setMessage(
            'project.queue.softDeleteByWorkspace'
        );

        return { message };
    }
}
