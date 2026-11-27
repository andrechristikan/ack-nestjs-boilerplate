import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumMfaChallengePurpose,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { DeviceService } from '@modules/device/services/device.service';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import type { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import type {
    IUser,
    IUserAuthOutcome,
} from '@modules/user/interfaces/user.interface';
import { UserUtil } from '@modules/user/utils/user.util';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/server';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';

@Injectable()
export class UserLoginCredentialUseCase implements IAppUseCase<
    [IRequestContext, IApiKeyContext, UserLoginRequestDto],
    IResponseReturn<IUserAuthOutcome>
> {
    constructor(
        private readonly userAuthService: UserAuthService,
        private readonly userPasswordService: UserPasswordService,
        private readonly userVerificationService: UserVerificationService,
        private readonly mfaService: MfaService,
        private readonly mfaPasskeyService: MfaPasskeyService,
        private readonly mfaChallengeService: MfaChallengeService,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly userUtil: UserUtil,
        private readonly deviceService: DeviceService,
        private readonly deviceUtil: DeviceUtil,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService
    ) {}

    private async resolveLoginOutcome(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        user: IUser,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        loginAt: Date
    ): Promise<IUserAuthOutcome> {
        const { lastWorkspaceChangedAt } = user;
        // Sequential by design: a write after its checks
        const [lastWorkspaceId, state] = await Promise.all([
            this.workspaceMemberService.resolveLastWorkspaceId(
                user.id,
                user.lastWorkspaceId
            ),
            this.mfaService.getFactorState(user.id),
        ]);
        const isMfaEnabled = await this.mfaService.isEnabled(state);
        if (!isMfaEnabled) {
            const { tokens } = await this.databaseService.withTransaction(
                async tx => {
                    const upserted =
                        await this.deviceService.upsertForLoginInTx(
                            tx,
                            user.id,
                            device,
                            loginAt
                        );

                    return this.userAuthService.createTokenAndSessionInTx(
                        tx,
                        requestContext,
                        apiKeyContext,
                        user,
                        upserted,
                        loginFrom,
                        loginWith,
                        loginAt,
                        false,
                        true
                    );
                }
            );

            return {
                isMfaRequired: false,
                lastWorkspaceId,
                lastWorkspaceChangedAt,
                tokens,
            };
        }

        const methods = await this.mfaService.getLoginMethods(state);
        let passkeyOptions: PublicKeyCredentialRequestOptionsJSON | null = null;
        if (methods.includes(EnumMfaMethod.passkey)) {
            passkeyOptions = await this.mfaPasskeyService.getAssertionOptions(
                state.passkeys
            );
        }

        const mfa = await this.databaseService.withTransaction(async tx => {
            const [challenge] = await Promise.all([
                this.mfaChallengeService.createInTx(tx, {
                    purpose: EnumMfaChallengePurpose.login,
                    userId: user.id,
                    device,
                    loginFrom,
                    loginWith,
                    webAuthnChallenge: passkeyOptions?.challenge ?? null,
                }),
                this.userPasswordService.resetPasswordAttemptInTx(tx, user.id),
            ]);

            return { ...challenge, methods, passkeyOptions };
        });

        return {
            isMfaRequired: true,
            lastWorkspaceId,
            lastWorkspaceChangedAt,
            mfa,
        };
    }

    private async requestVerificationEmail(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        user: IUser
    ): Promise<void> {
        // Sequential by design: a write after its checks
        const isResendable =
            await this.userVerificationService.isEmailResendable(user);
        if (!isResendable) {
            return;
        }

        await this.databaseService.withTransaction(async tx => {
            await Promise.all([
                this.userVerificationService.sendEmailInTx(
                    tx,
                    user.id,
                    user.email
                ),
                this.userPasswordService.resetPasswordAttemptInTx(tx, user.id),
            ]);
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
    }

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        { email, password, from, device }: UserLoginRequestDto
    ): Promise<IResponseReturn<IUserAuthOutcome>> {
        const deviceIdentity = this.deviceUtil.toIdentity(device);
        const credential =
            await this.userAuthService.getOneForCredentialLogin(email);
        const { user } = credential;
        this.userPasswordService.assertPasswordAttemptAvailable(user);

        // Sequential by design: a credential proof, awaited alone
        const isMatch = await this.userAuthService.isCredentialMatch(
            credential,
            password
        );
        if (!isMatch) {
            const limit =
                await this.userPasswordService.getPasswordAttemptLimit();
            const isLocked = await this.databaseService.withTransaction(
                async tx => {
                    const isLockedNow =
                        await this.userPasswordService.countFailedPasswordAttemptInTx(
                            tx,
                            requestContext,
                            apiKeyContext,
                            user.id,
                            limit
                        );
                    const failedEntry = this.activityLogQueue.recordEffect(
                        requestContext,
                        apiKeyContext,
                        null,
                        {
                            action: EnumActivityLogAction.userLoginFailed,
                            userId: user.id,
                            createdBy: user.id,
                        }
                    );
                    await this.outboxService.addInTx(tx, failedEntry);

                    return isLockedNow;
                }
            );
            this.userPasswordService.assertPasswordNotLocked(isLocked);
        }
        this.userAuthService.assertCredentialMatched(isMatch);

        const isUnverified = this.userUtil.isUnverified(user);
        if (isUnverified) {
            await this.requestVerificationEmail(
                requestContext,
                apiKeyContext,
                user
            );
        }
        this.userAuthService.assertVerified(user);
        this.userAuthService.assertPasswordNotExpired(user);

        const loginAt = this.helperDateService.now();
        const outcome = await this.resolveLoginOutcome(
            requestContext,
            apiKeyContext,
            user,
            deviceIdentity,
            from,
            EnumUserLoginWith.credential,
            loginAt
        );

        return { data: outcome };
    }
}
