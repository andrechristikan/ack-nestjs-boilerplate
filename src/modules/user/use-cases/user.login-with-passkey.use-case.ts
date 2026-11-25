import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { DatabaseService } from '@common/database/services/database.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumMfaChallengePurpose,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import { DeviceService } from '@modules/device/services/device.service';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import type { UserLoginPasskeyRequestDto } from '@modules/user/dtos/request/user.login-passkey.request.dto';
import type { IUserAuthTokenOutcome } from '@modules/user/interfaces/user.interface';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserLoginWithPasskeyUseCase implements IAppUseCase<
    [IRequestContext, IApiKeyContext, UserLoginPasskeyRequestDto],
    IResponseReturn<IUserAuthTokenOutcome>
> {
    constructor(
        private readonly userAuthService: UserAuthService,
        private readonly mfaService: MfaService,
        private readonly mfaChallengeService: MfaChallengeService,
        private readonly mfaPasskeyService: MfaPasskeyService,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly deviceService: DeviceService,
        private readonly deviceUtil: DeviceUtil,
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService
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
    ): Promise<IResponseReturn<IUserAuthTokenOutcome>> {
        const [{ webAuthnChallenge }, passkey] = await Promise.all([
            this.mfaChallengeService.get(
                challengeToken,
                EnumMfaChallengePurpose.passwordless
            ),
            this.mfaPasskeyService.getOneForLogin(passkeyResponse.id),
        ]);
        const user = await this.userAuthService.getOneForPasskeyLogin(
            passkey.userId
        );
        // Sequential by design: a credential proof, awaited alone
        const { check, failure } = await this.mfaService.checkPasskeyLogin(
            user.id,
            passkey,
            passkeyResponse,
            webAuthnChallenge
        );
        if (failure !== null) {
            const isLocked = await this.databaseService.withTransaction(
                async tx =>
                    this.mfaService.countFailedAttemptInTx(
                        tx,
                        requestContext,
                        apiKeyContext,
                        user.id,
                        failure
                    )
            );

            return this.mfaService.throwFailedAttempt(failure, isLocked);
        }
        const lastWorkspaceId =
            await this.workspaceMemberService.resolveLastWorkspaceId(
                user.id,
                user.lastWorkspaceId
            );

        const deviceIdentity = this.deviceUtil.toIdentity(device);
        const loginAt = this.helperDateService.now();
        const { tokens } = await this.databaseService.withTransaction(
            async tx => {
                await this.mfaService.completeChallengeInTx(
                    tx,
                    user.id,
                    challengeToken,
                    EnumMfaChallengePurpose.passwordless,
                    check
                );
                const upserted = await this.deviceService.upsertForLoginInTx(
                    tx,
                    user.id,
                    deviceIdentity,
                    loginAt
                );

                return this.userAuthService.createTokenAndSessionInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    user,
                    upserted,
                    from,
                    EnumUserLoginWith.passkey,
                    loginAt,
                    false,
                    false
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
    }
}
