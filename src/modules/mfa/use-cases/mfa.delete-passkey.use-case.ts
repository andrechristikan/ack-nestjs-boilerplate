import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumUserReauthenticationAction,
} from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { MfaPasskeyDeleteRequestDto } from '@modules/mfa/dtos/request/mfa.passkey-delete.request.dto';
import { MfaInvalidException } from '@modules/mfa/exceptions/mfa.invalid.exception';
import { MfaPasskeyNotFoundException } from '@modules/mfa/exceptions/mfa.passkey-not-found.exception';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { SessionService } from '@modules/session/services/session.service';
import type { IUserContext } from '@modules/user/interfaces/user.interface';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MfaDeletePasskeyUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        string,
        MfaPasskeyDeleteRequestDto,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly mfaService: MfaService,
        private readonly mfaPasskeyService: MfaPasskeyService,
        private readonly userAuthService: UserAuthService,
        private readonly sessionService: SessionService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        { user }: IUserContext,
        passkeyId: string,
        {
            password,
            method,
            code,
            backupCode,
            passkeyChallengeToken,
            passkeyResponse,
            otp,
        }: MfaPasskeyDeleteRequestDto
    ): Promise<IResponseReturn<void>> {
        const check = await this.userAuthService.assertReauthentication(
            requestContext,
            apiKeyContext,
            user,
            {
                action: EnumUserReauthenticationAction.mfaPasskeyDelete,
                password: password ?? null,
                method: method ?? null,
                code: code ?? null,
                backupCode: backupCode ?? null,
                passkeyChallengeToken: passkeyChallengeToken ?? null,
                passkeyResponse: passkeyResponse ?? null,
                otp: otp ?? null,
            }
        );

        const now = this.helperDateService.create();
        try {
            await this.databaseService.withTransaction(async tx => {
                await this.userAuthService.completeReauthenticationInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    check
                );
                await this.mfaPasskeyService.deleteInTx(
                    tx,
                    authContext.userId,
                    passkeyId
                );
                await this.mfaService.clearBackupCodesIfNoFactorInTx(
                    tx,
                    authContext.userId
                );
                await this.sessionService.revokeActiveByUserExceptInTx(
                    tx,
                    authContext.userId,
                    authContext.sessionId,
                    authContext.userId,
                    now
                );
                const entry = this.activityLogQueue.recordEffect(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    null,
                    { action: EnumActivityLogAction.userDeleteMfaPasskey }
                );
                await this.outboxService.addInTx(tx, entry);
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw check.mfa !== null
                    ? new MfaInvalidException()
                    : new MfaPasskeyNotFoundException();
            }

            throw new AppUnknownException(err);
        }

        return {};
    }
}
