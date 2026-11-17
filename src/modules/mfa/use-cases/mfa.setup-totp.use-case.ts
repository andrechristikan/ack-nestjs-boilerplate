import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumUserReauthenticationAction,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { MfaInvalidException } from '@modules/mfa/exceptions/mfa.invalid.exception';
import type { IMfaTotpSetup } from '@modules/mfa/interfaces/mfa.interface';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { MfaTotpService } from '@modules/mfa/services/mfa.totp.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import type { MfaTotpSetupRequestDto } from '@modules/mfa/dtos/request/mfa.totp-setup.request.dto';
import type { IUserContext } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class MfaSetupTotpUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        MfaTotpSetupRequestDto,
    ],
    IResponseReturn<IMfaTotpSetup>
> {
    constructor(
        private readonly mfaService: MfaService,
        private readonly mfaTotpService: MfaTotpService,
        private readonly userAuthService: UserAuthService,
        private readonly activityLogService: ActivityLogService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        {
            method,
            code,
            backupCode,
            password,
            passkeyChallengeToken,
            passkeyResponse,
            otp,
        }: MfaTotpSetupRequestDto
    ): Promise<IResponseReturn<IMfaTotpSetup>> {
        const { user } = userContext;
        // Sequential by design: gates before the work they guard
        await this.mfaService.assertEnrolmentAllowed(EnumMfaMethod.totp);
        const check = await this.userAuthService.assertReauthentication(
            requestContext,
            apiKeyContext,
            user,
            {
                action: EnumUserReauthenticationAction.mfaTotpSetup,
                password: password ?? null,
                method: method ?? null,
                code: code ?? null,
                backupCode: backupCode ?? null,
                passkeyChallengeToken: passkeyChallengeToken ?? null,
                passkeyResponse: passkeyResponse ?? null,
                otp: otp ?? null,
            }
        );

        try {
            const setup = await this.outboxService.withTransaction(async tx => {
                await this.userAuthService.completeReauthenticationInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    check
                );
                const totpSetup = await this.mfaTotpService.setupInTx(
                    tx,
                    authContext.userId,
                    user.email
                );
                const entry = this.activityLogService.recordEffect(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    null,
                    {
                        action: EnumActivityLogAction.userSetupMfaTotp,
                        userId: authContext.userId,
                        createdBy: authContext.userId,
                    }
                );
                await this.outboxService.addInTx(tx, entry);

                return totpSetup;
            });

            return { data: setup };
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (
                check.mfa !== null &&
                mapped instanceof DatabaseWriteConflictException
            ) {
                throw new MfaInvalidException();
            }

            throw new AppUnknownException(err);
        }
    }
}
