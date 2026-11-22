import { UserProfileService } from '@modules/user/services/user.profile.service';
import type { IUserDeletePhotoPayload } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import type { IUserDeletePhotoQueueResponse } from '@modules/user/interfaces/user.interface';
import { MessageService } from '@common/message/services/message.service';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserProcessDeletePhotoUseCase implements IAppUseCase<
    [IUserDeletePhotoPayload],
    IUserDeletePhotoQueueResponse
> {
    constructor(
        private readonly userProfileService: UserProfileService,
        private readonly messageService: MessageService
    ) {}

    async execute(
        data: IUserDeletePhotoPayload
    ): Promise<IUserDeletePhotoQueueResponse> {
        const { key, access } = data;

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
