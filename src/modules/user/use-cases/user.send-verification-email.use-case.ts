import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { UserSendEmailVerificationRequestDto } from '@modules/user/dtos/request/user.send-email-verification.request.dto';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserSendVerificationEmailUseCase implements IAppUseCase<
    [UserSendEmailVerificationRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly userVerificationService: UserVerificationService,
        private readonly activityLogService: ActivityLogService
    ) {}

    async execute({
        email,
    }: UserSendEmailVerificationRequestDto): Promise<IResponseReturn<void>> {
        const user =
            await this.userVerificationService.getOneForResendByEmail(email);
        if (user === null) {
            return {};
        }

        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userSendVerificationEmail,
                userId: user.id,
                createdBy: user.id,
            }),
        ];
        // Sequential by design: write must not run if an earlier step throws
        await this.userVerificationService.sendEmail(user.id, user.email);

        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
