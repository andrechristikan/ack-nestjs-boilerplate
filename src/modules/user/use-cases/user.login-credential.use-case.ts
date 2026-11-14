import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { SessionService } from '@modules/session/services/session.service';
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
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly sessionService: SessionService,
        private readonly activityLogService: ActivityLogService,
        private readonly userUtil: UserUtil,
        private readonly deviceUtil: DeviceUtil,
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService
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
        const lastWorkspaceId =
            await this.workspaceMemberService.resolveLastWorkspaceId(
                user.id,
                user.lastWorkspaceId
            );
        const isTwoFactorEnabled = this.userUtil.isTwoFactorEnabled(user);
        if (!isTwoFactorEnabled) {
            const tokens = await this.startSession(
                requestContext,
                apiKeyContext,
                user,
                device,
                loginFrom,
                loginWith,
                loginAt
            );

            return {
                isTwoFactorEnable: false,
                lastWorkspaceId,
                lastWorkspaceChangedAt,
                tokens,
            };
        }

        const twoFactor = await this.userAuthService.createTwoFactorChallenge(
            requestContext,
            apiKeyContext,
            user,
            device,
            loginFrom,
            loginWith
        );

        return {
            isTwoFactorEnable: true,
            lastWorkspaceId,
            lastWorkspaceChangedAt,
            twoFactor,
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
            await this.userVerificationService.sendEmailInTx(
                tx,
                user.id,
                user.email
            );
            const entry = this.activityLogService.recordEffect(
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
        const attempt = await this.userAuthService.countCredentialAttempt(
            requestContext,
            apiKeyContext,
            email
        );

        this.userPasswordService.assertAttemptCounted(attempt.isAttemptCounted);

        // Sequential by design: gate before the work it guards
        const isMatch = await this.userAuthService.verifyCredential(
            attempt,
            password
        );
        if (!isMatch) {
            const failedEntry = this.activityLogService.recordEffect(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userLoginFailed,
                    userId: attempt.user.id,
                    createdBy: attempt.user.id,
                }
            );
            await this.outboxService.add(failedEntry);
        }
        this.userAuthService.assertCredentialMatched(isMatch);

        const isUnverified = this.userUtil.isUnverified(attempt.user);
        if (isUnverified) {
            await this.requestVerificationEmail(
                requestContext,
                apiKeyContext,
                attempt.user
            );
        }
        this.userAuthService.assertVerified(attempt.user);
        this.userAuthService.assertPasswordNotExpired(attempt.user);

        const loginAt = this.helperDateService.create();
        const outcome = await this.resolveLoginOutcome(
            requestContext,
            apiKeyContext,
            attempt.user,
            deviceIdentity,
            from,
            EnumUserLoginWith.credential,
            loginAt
        );

        return { data: outcome };
    }
}
