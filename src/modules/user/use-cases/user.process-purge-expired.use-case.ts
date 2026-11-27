import { MessageService } from '@common/message/services/message.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { Injectable } from '@nestjs/common';
import type { IUserPurgeExpiredQueueResponse } from '@modules/user/interfaces/user.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserProcessPurgeExpiredUseCase implements IAppUseCase<
    [],
    IUserPurgeExpiredQueueResponse
> {
    constructor(
        private readonly userVerificationService: UserVerificationService,
        private readonly userPasswordService: UserPasswordService,
        private readonly messageService: MessageService
    ) {}

    async execute(): Promise<IUserPurgeExpiredQueueResponse> {
        const [verifications, forgotPasswords] = await Promise.all([
            this.userVerificationService.purgeExpired(),
            this.userPasswordService.purgeExpiredForgotPasswords(),
        ]);

        const message = this.messageService.setMessage(
            'user.queue.auth.purgeExpired'
        );

        return {
            message,
            verifications,
            forgotPasswords,
        };
    }
}
