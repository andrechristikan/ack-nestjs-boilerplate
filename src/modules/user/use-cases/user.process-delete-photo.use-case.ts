import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { EnumUserProcess } from '@modules/user/enums/user.enum';
import type { IUserDeletePhotoPayload } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { QueueException } from '@queues/exceptions/queue.exception';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { Job } from 'bullmq';
import { MessageService } from '@common/message/services/message.service';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserProcessDeletePhotoUseCase implements IAppUseCase<
    [Job<IUserDeletePhotoPayload, unknown, EnumUserProcess>],
    IQueueResponse
> {
    constructor(
        private readonly userProfileService: UserProfileService,
        private readonly messageService: MessageService
    ) {}

    async execute(
        job: Job<IUserDeletePhotoPayload, unknown, EnumUserProcess>
    ): Promise<IQueueResponse> {
        const { key, access: storedAccess } = job.data;
        const access =
            Object.values(EnumAwsS3Accessibility).find(
                value => value === storedAccess
            ) ?? null;
        if (access === null) {
            const message = this.messageService.setMessage(
                'user.queue.error.photoAccessInvalid',
                { properties: { key, access: storedAccess } }
            );

            throw new QueueException(message, true);
        }

        await this.userProfileService.deletePhotoObject(key, access);

        const message = this.messageService.setMessage(
            'user.queue.deletePhoto'
        );

        return {
            message,
            key,
        };
    }
}
