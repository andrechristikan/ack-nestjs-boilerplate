import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MessageService } from '@common/message/services/message.service';
import { SessionWorkerDto } from '@module/session/dtos/session.worker.dto';
import { ENUM_SESSION_PROCESS } from '@module/session/enums/session.enum';
import { ISessionProcessor } from '@module/session/interfaces/session.processor.interface';
import { SessionService } from '@module/session/services/session.service';
import { ENUM_WORKER_QUEUES } from '@worker/enums/worker.enum';

@Processor(ENUM_WORKER_QUEUES.SESSION_QUEUE)
export class SessionProcessor extends WorkerHost implements ISessionProcessor {
    private readonly logger = new Logger(SessionProcessor.name);

    constructor(
        private readonly sessionService: SessionService,
        private readonly messageService: MessageService
    ) {
        super();
    }

    async process(job: Job<SessionWorkerDto, any, string>): Promise<void> {
        try {
            const jobName = job.name;
            switch (jobName) {
                case ENUM_SESSION_PROCESS.REVOKE:
                default:
                    await this.processDeleteLoginSession(job.data.session);

                    break;
            }
        } catch (error: any) {
            this.logger.error(error);
        }

        return;
    }

    async processDeleteLoginSession(session: string): Promise<void> {
        const checkSession = await this.sessionService.findOneById(session);

        if (!checkSession) {
            throw new Error(
                this.messageService.setMessage('session.error.notFound')
            );
        }

        await this.sessionService.updateRevoke(checkSession);

        return;
    }
}
