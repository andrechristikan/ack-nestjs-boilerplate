import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import type { UserSendEmailVerificationRequestDto } from '@modules/user/dtos/request/user.send-email-verification.request.dto';
import { UserService } from '@modules/user/services/user.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';

@Injectable()
export class UserSendVerificationEmailUseCase implements IAppUseCase<
    [IRequestContext, IApiKeyContext, UserSendEmailVerificationRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly userService: UserService,
        private readonly userVerificationService: UserVerificationService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        { email }: UserSendEmailVerificationRequestDto
    ): Promise<IResponseReturn<void>> {
        this.userService.assertEmailDeliverable();

        const user =
            await this.userVerificationService.getOneForResendByEmail(email);
        if (user === null) {
            return {};
        }

        await this.databaseService.withTransaction(async tx => {
            await this.userVerificationService.sendEmailInTx(
                tx,
                user.id,
                user.email
            );
            const entry = this.activityLogQueue.recordEffect(
                requestContext,
                apiKeyContext,
                null,
                {
                    action: EnumActivityLogAction.userVerificationEmailSent,
                    userId: user.id,
                    createdBy: user.id,
                }
            );
            await this.outboxService.addInTx(tx, entry);
        });

        return {};
    }
}
