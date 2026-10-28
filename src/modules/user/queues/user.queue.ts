import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import type { UserPhoto } from '@generated/prisma-client/client';
import { EnumUserProcess } from '@modules/user/enums/user.enum';
import type { IUserDeletePhotoPayload } from '@modules/user/interfaces/user.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { QueueBase } from '@queues/bases/queue.base';
import { EnumQueue, EnumQueuePriority } from '@queues/enums/queue.enum';
import { MessageService } from '@common/message/services/message.service';

/**
 * Enqueues the S3 delete of a replaced profile photo, each job under a fresh job id.
 */
@Injectable()
export class UserQueue extends QueueBase {
    private readonly deletePhotoJobIdPattern: string;

    constructor(
        @InjectQueue(EnumQueue.user) protected readonly queue: Queue,
        protected readonly sentryService: SentryService,
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly messageService: MessageService
    ) {
        super(queue, sentryService);
        this.deletePhotoJobIdPattern = this.configService.get<string>(
            'user.jobId.deletePhotoPattern'
        )!;
    }

    async deletePhoto(userId: string, photo: UserPhoto): Promise<void> {
        const nonce = this.databaseUtil.createId();
        const jobId = this.helperStringService.fillPattern(
            this.deletePhotoJobIdPattern,
            { process: EnumUserProcess.deletePhoto, nonce }
        );
        const data: IUserDeletePhotoPayload = {
            userId,
            key: photo.key,
            access: photo.access,
        };

        const description = this.messageService.setMessage(
            'user.queue.error.enqueueDeletePhoto'
        );

        await this.addSideEffect(
            EnumUserProcess.deletePhoto,
            data,
            {
                priority: EnumQueuePriority.low,
                jobId,
            },
            description
        );
    }
}
