import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { MfaService } from '@modules/mfa/services/mfa.service';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import type { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import type {
    IUser,
    IUserLoginOutcome,
} from '@modules/user/interfaces/user.interface';
import { UserUtil } from '@modules/user/utils/user.util';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';

@Injectable()
export class UserLoginCredentialUseCase implements IAppUseCase<
    [IRequestContext, IApiKeyContext, UserLoginRequestDto],
    IResponseReturn<IUserLoginOutcome>
> {
    constructor(
        private readonly userAuthService: UserAuthService,
        private readonly userPasswordService: UserPasswordService,
        private readonly userVerificationService: UserVerificationService,
        private readonly mfaService: MfaService,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly userUtil: UserUtil,
        private readonly deviceUtil: DeviceUtil,
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
    ): Promise<IUserLoginOutcome> {
        const { lastWorkspaceChangedAt } = user;
        // Sequential by design: write must not run if an earlier step throws
        const [lastWorkspaceId, isMfaEnabled] = await Promise.all([
            this.workspaceMemberService.resolveLastWorkspaceId(
                user.id,
                user.lastWorkspaceId
            ),
            this.mfaService.isEnabled(user.id),
        ]);
        if (!isMfaEnabled) {
            const { tokens } = await this.outboxService.withTransaction(
                async tx => {
                    await this.userPasswordService.resetPasswordAttemptInTx(
                        tx,
                        user.id
                    );

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

            return {
                isMfaRequired: false,
                lastWorkspaceId,
                lastWorkspaceChangedAt,
                tokens,
            };
        }

        const mfa = await this.outboxService.withTransaction(async tx => {
            await this.userPasswordService.resetPasswordAttemptInTx(
                tx,
                user.id
            );

            return this.userAuthService.createMfaChallengeInTx(
                tx,
                user.id,
                device,
                loginFrom,
                loginWith
            );
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
        // Sequential by design: gate before the work it guards
        const isResendable =
            await this.userVerificationService.isEmailResendable(user);
        if (!isResendable) {
            return;
        }

        await this.outboxService.withTransaction(async tx => {
            await this.userPasswordService.resetPasswordAttemptInTx(
                tx,
                user.id
            );
            await this.userVerificationService.sendEmailInTx(
                tx,
                user.id,
                user.email
            );
            const entry = this.activityLogQueue.recordEffect(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userSendVerificationEmail,
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
    ): Promise<IResponseReturn<IUserLoginOutcome>> {
        const deviceIdentity = this.deviceUtil.toIdentity(device);
        const credential =
            await this.userAuthService.getOneForCredentialLogin(email);
        const { user } = credential;
        this.userPasswordService.assertPasswordAttemptAvailable(user);

        // Sequential by design: gate before the work it guards; write after the gate; the count precedes the failed entry
        const isMatch = await this.userAuthService.isCredentialMatch(
            credential,
            password
        );
        if (!isMatch) {
            const isLocked =
                await this.userPasswordService.countFailedPasswordAttempt(
                    requestContext,
                    apiKeyContext,
                    user
                );
            const failedEntry = this.activityLogQueue.recordEffect(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userLoginFailed,
                    userId: user.id,
                    createdBy: user.id,
                }
            );
            await this.outboxService.add(failedEntry);
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

        const loginAt = this.helperDateService.create();
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
