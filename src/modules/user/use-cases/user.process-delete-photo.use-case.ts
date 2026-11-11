import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import type { IUserDeletePhotoPayload } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import { MessageService } from '@common/message/services/message.service';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserProcessDeletePhotoUseCase implements IAppUseCase<
    [IUserDeletePhotoPayload],
    IQueueResponse
> {
    constructor(
        private readonly userProfileService: UserProfileService,
        private readonly messageService: MessageService
    ) {}

    async execute(data: IUserDeletePhotoPayload): Promise<IQueueResponse> {
        const { key, access: storedAccess } = data;
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
