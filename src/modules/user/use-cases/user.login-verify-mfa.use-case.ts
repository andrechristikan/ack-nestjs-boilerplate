import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumMfaChallengePurpose,
} from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import { MfaChallengeInvalidException } from '@modules/mfa/exceptions/mfa.challenge-invalid.exception';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import type { UserLoginVerifyMfaRequestDto } from '@modules/user/dtos/request/user.login-verify-mfa.request.dto';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';

@Injectable()
export class UserLoginVerifyMfaUseCase implements IAppUseCase<
    [IRequestContext, IApiKeyContext, UserLoginVerifyMfaRequestDto],
    IResponseReturn<IAuthToken>
> {
    constructor(
        private readonly userAuthService: UserAuthService,
        private readonly mfaService: MfaService,
        private readonly mfaChallengeService: MfaChallengeService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        {
            challengeToken,
            code,
            backupCode,
            method,
            passkeyResponse,
        }: UserLoginVerifyMfaRequestDto
    ): Promise<IResponseReturn<IAuthToken>> {
        const { userId, device, loginFrom, loginWith, webAuthnChallenge } =
            await this.mfaChallengeService.getLogin(challengeToken);

        const user = await this.userAuthService.getOneForMfaLogin(userId);
        const checked = await this.mfaService.check(
            requestContext,
            apiKeyContext,
            user.id,
            {
                code: code ?? null,
                backupCode: backupCode ?? null,
                method,
                passkeyResponse: passkeyResponse ?? null,
            },
            webAuthnChallenge
        );
        const loginAt = this.helperDateService.create();
        try {
            const { tokens } = await this.outboxService.withTransaction(
                async tx => {
                    await this.mfaChallengeService.consumeInTx(
                        tx,
                        challengeToken,
                        EnumMfaChallengePurpose.login,
                        user.id
                    );
                    await this.mfaService.completeInTx(tx, user.id, checked);
                    const entry = this.activityLogQueue.recordEffect(
                        requestContext,
                        apiKeyContext,
                        null,
                        null,
                        {
                            action: EnumActivityLogAction.userVerifyMfa,
                            userId: user.id,
                            createdBy: user.id,
                        }
                    );
                    await this.outboxService.addInTx(tx, entry);

                    return this.userAuthService.createTokenAndSessionInTx(
                        tx,
                        requestContext,
                        apiKeyContext,
                        user,
                        device,
                        loginFrom,
                        loginWith,
                        loginAt
                    );
                }
            );

            return { data: tokens };
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new MfaChallengeInvalidException();
            }

            throw new AppUnknownException(err);
        }
    }
}
