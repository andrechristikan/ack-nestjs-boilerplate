import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { DatabaseService } from '@common/database/services/database.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumMfaChallengePurpose,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { MfaChallengeInvalidException } from '@modules/mfa/exceptions/mfa.challenge-invalid.exception';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import type { UserLoginPasskeyRequestDto } from '@modules/user/dtos/request/user.login-passkey.request.dto';
import type { IUserLoginTokenOutcome } from '@modules/user/interfaces/user.interface';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserLoginWithPasskeyUseCase implements IAppUseCase<
    [IRequestContext, IApiKeyContext, UserLoginPasskeyRequestDto],
    IResponseReturn<IUserLoginTokenOutcome>
> {
    constructor(
        private readonly userAuthService: UserAuthService,
        private readonly mfaService: MfaService,
        private readonly mfaChallengeService: MfaChallengeService,
        private readonly mfaPasskeyService: MfaPasskeyService,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly deviceUtil: DeviceUtil,
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        {
            challengeToken,
            passkeyResponse,
            from,
            device,
        }: UserLoginPasskeyRequestDto
    ): Promise<IResponseReturn<IUserLoginTokenOutcome>> {
        // Sequential by design: gates before the work they guard; the lock and the check precede the writes
        const { webAuthnChallenge } = await this.mfaChallengeService.get(
            challengeToken,
            EnumMfaChallengePurpose.passwordless
        );
        const passkey = await this.mfaPasskeyService.getOneForLogin(
            passkeyResponse.id
        );

        const user = await this.userAuthService.getOneForPasskeyLogin(
            passkey.userId
        );
        await this.mfaService.assertAttemptAvailable(user.id);
        const checked = await this.mfaService.checkPasskeyLogin(
            requestContext,
            apiKeyContext,
            user.id,
            passkeyResponse,
            webAuthnChallenge
        );
        const lastWorkspaceId =
            await this.workspaceMemberService.resolveLastWorkspaceId(
                user.id,
                user.lastWorkspaceId
            );

        const deviceIdentity = this.deviceUtil.toIdentity(device);
        const loginAt = this.helperDateService.create();
        try {
            const { tokens } = await this.databaseService.withTransaction(
                async tx => {
                    await this.mfaChallengeService.consumeInTx(
                        tx,
                        challengeToken,
                        EnumMfaChallengePurpose.passwordless,
                        user.id
                    );
                    await this.mfaService.completeInTx(tx, user.id, checked);

                    return this.userAuthService.createTokenAndSessionInTx(
                        tx,
                        requestContext,
                        apiKeyContext,
                        user,
                        deviceIdentity,
                        from,
                        EnumUserLoginWith.passkey,
                        loginAt
                    );
                }
            );

            return {
                data: {
                    isMfaRequired: false,
                    tokens,
                    lastWorkspaceId,
                    lastWorkspaceChangedAt: user.lastWorkspaceChangedAt,
                },
            };
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
