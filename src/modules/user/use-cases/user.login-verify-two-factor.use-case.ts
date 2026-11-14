import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { AuthTwoFactorService } from '@modules/auth/services/auth.two-factor.service';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { AuthTwoFactorInvalidException } from '@modules/auth/exceptions/auth.two-factor-invalid.exception';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { SessionService } from '@modules/session/services/session.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type { UserLoginVerifyTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';
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
        private readonly sessionService: SessionService,
        private readonly authTwoFactorService: AuthTwoFactorService,
        private readonly activityLogService: ActivityLogService,
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    private async startSession(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        user: IUser,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        loginAt: Date
    ): Promise<IAuthToken> {
        const session = await this.userAuthService.createTokenAndSession(
            requestContext,
            apiKeyContext,
            user,
            device,
            loginFrom,
            loginWith,
            loginAt
        );
        await this.sessionService.setLoginOrRevoke(
            user.id,
            session.sessionId,
            session.jti
        );

        return session.tokens;
    }

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
            await this.authTwoFactorService.getChallenge(challengeToken);

        const user = await this.userTwoFactorService.getOneForLoginVerify(
            challenge.userId
        );
        // Sequential by design: gate before the work it guards; write must not run if an earlier step throws
        await this.userTwoFactorService.assertAttemptCounted(
            requestContext,
            apiKeyContext,
            user
        );
        const verified = await this.userTwoFactorService.verify(user, {
            code: code ?? null,
            backupCode: backupCode ?? null,
            method,
        });
        await this.authTwoFactorService.consumeChallenge(challengeToken);
        try {
            await this.outboxService.withTransaction(async tx => {
                await this.userTwoFactorService.recordVerificationInTx(
                    tx,
                    user,
                    verified
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
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new AuthTwoFactorInvalidException();
            }

            throw new AppUnknownException(err);
        }

        const loginAt = this.helperDateService.create();
        const tokens = await this.startSession(
            requestContext,
            apiKeyContext,
            user,
            challenge.device,
            challenge.loginFrom,
            challenge.loginWith,
            loginAt
        );

        return { data: tokens };
    }
}
