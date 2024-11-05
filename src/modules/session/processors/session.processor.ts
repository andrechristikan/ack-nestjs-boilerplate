import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MessageService } from 'src/common/message/services/message.service';
import { SessionWorkerDto } from 'src/modules/session/dtos/session.worker.dto';
import { ENUM_SESSION_PROCESS } from 'src/modules/session/enums/session.enum';
import { ISessionProcessor } from 'src/modules/session/interfaces/session.processor.interface';
import { SessionService } from 'src/modules/session/services/session.service';
import { ENUM_WORKER_QUEUES } from 'src/worker/enums/worker.enum';

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
