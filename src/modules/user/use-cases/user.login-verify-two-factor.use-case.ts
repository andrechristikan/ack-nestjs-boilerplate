import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import { AuthTwoFactorChallengeInvalidException } from '@modules/auth/exceptions/auth.two-factor-challenge-invalid.exception';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type { UserLoginVerifyTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';

@Injectable()
export class UserLoginVerifyTwoFactorUseCase implements IAppUseCase<
    [IRequestContext, IApiKeyContext, UserLoginVerifyTwoFactorRequestDto],
    IResponseReturn<IAuthToken>
> {
    constructor(
        private readonly userAuthService: UserAuthService,
        private readonly userTwoFactorService: UserTwoFactorService,
        private readonly activityLogService: ActivityLogService,
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
        }: UserLoginVerifyTwoFactorRequestDto
    ): Promise<IResponseReturn<IAuthToken>> {
        const challenge =
            await this.userTwoFactorService.getChallenge(challengeToken);

        const user = await this.userTwoFactorService.getOneForLoginVerify(
            challenge.userId
        );
        const checked = await this.userTwoFactorService.check(
            requestContext,
            apiKeyContext,
            user,
            {
                code: code ?? null,
                backupCode: backupCode ?? null,
                method,
            }
        );
        const loginAt = this.helperDateService.create();
        try {
            const { tokens } = await this.outboxService.withTransaction(
                async tx => {
                    await this.userTwoFactorService.consumeChallengeInTx(
                        tx,
                        challengeToken
                    );
                    await this.userTwoFactorService.verifyInTx(
                        tx,
                        user.id,
                        checked
                    );
                    await this.userTwoFactorService.recordVerificationInTx(
                        tx,
                        user,
                        checked.verified
                    );
                    const entry = this.activityLogService.recordEffect(
                        requestContext,
                        apiKeyContext,
                        null,
                        null,
                        {
                            action: EnumActivityLogAction.userVerifyTwoFactor,
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
                        challenge.device,
                        challenge.loginFrom,
                        challenge.loginWith,
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
                throw new AuthTwoFactorChallengeInvalidException();
            }

            throw new AppUnknownException(err);
        }
    }
}
