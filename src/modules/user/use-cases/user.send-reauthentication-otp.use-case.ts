import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import type { UserReauthenticationSendRequestDto } from '@modules/user/dtos/request/user.reauthentication-send.request.dto';
import type { IUserContext } from '@modules/user/interfaces/user.interface';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class UserSendReauthenticationOtpUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        UserReauthenticationSendRequestDto,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly userAuthService: UserAuthService,
        private readonly userVerificationService: UserVerificationService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        { user }: IUserContext,
        { action }: UserReauthenticationSendRequestDto
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: gates before the write they guard
        await this.userAuthService.assertReauthenticationOtpAllowed(user);
        await this.userVerificationService.assertReauthenticationResendable(
            user.id,
            action
        );

        await this.databaseService.withTransaction(async tx => {
            await this.userVerificationService.sendReauthenticationInTx(
                tx,
                user.id,
                user.email,
                action
            );
            const entry = this.activityLogQueue.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userSendReauthenticationOtp,
                }
            );
            await this.outboxService.addInTx(tx, entry);
        });

        return {};
    }
}
