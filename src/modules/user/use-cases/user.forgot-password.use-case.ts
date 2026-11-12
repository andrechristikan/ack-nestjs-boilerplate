import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import type { UserForgotPasswordRequestDto } from '@modules/user/dtos/request/user.forgot-password.request.dto';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserForgotPasswordUseCase implements IAppUseCase<
    [UserForgotPasswordRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly userPasswordService: UserPasswordService,
        private readonly activityLogService: ActivityLogService
    ) {}

    async execute({
        email,
    }: UserForgotPasswordRequestDto): Promise<IResponseReturn<void>> {
        const prepared =
            await this.userPasswordService.prepareForgotPassword(email);
        if (prepared === null) {
            return {};
        }

        const { user, forgot } = prepared;
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userForgotPassword,
                userId: user.id,
                createdBy: user.id,
            }),
        ];

        await this.userPasswordService.createForgotPassword(
            user.id,
            email,
            forgot
        );

        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
