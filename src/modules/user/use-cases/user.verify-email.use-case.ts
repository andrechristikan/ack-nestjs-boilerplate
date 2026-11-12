import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { UserVerifyEmailRequestDto } from '@modules/user/dtos/request/user.verify-email.request.dto';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserVerifyEmailUseCase implements IAppUseCase<
    [UserVerifyEmailRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly userVerificationService: UserVerificationService,
        private readonly activityLogService: ActivityLogService
    ) {}

    async execute({
        token,
    }: UserVerifyEmailRequestDto): Promise<IResponseReturn<void>> {
        const { verification } =
            await this.userVerificationService.getOneActiveByEmailToken(token);

        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userVerifiedEmail,
                userId: verification.userId,
                createdBy: verification.userId,
            }),
        ];
        // Sequential by design: write must not run if an earlier step throws
        await this.userVerificationService.verifyEmail(verification);

        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
