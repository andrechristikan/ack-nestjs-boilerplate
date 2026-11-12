import { HelperDateService } from '@common/helper/services/helper.date.service';
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

@Injectable()
export class UserLoginCredentialUseCase implements IAppUseCase<
    [UserLoginRequestDto],
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
        private readonly helperDateService: HelperDateService
    ) {}

    private async startSession(
        user: IUser,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        loginAt: Date
    ): Promise<IAuthToken> {
        const session = await this.userAuthService.createTokenAndSession(
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

        if (session.revokeStages.length > 0) {
            const revokeLogs = session.revokeStages.map(stage =>
                this.activityLogService.prepare(stage)
            );

            this.activityLogService.stagePrepared(revokeLogs);
        }

        return session.tokens;
    }

    private async resolveLoginOutcome(
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

    private async completeLogin(
        user: IUser,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith
    ): Promise<IUserLoginOutcome> {
        const loginAt = this.helperDateService.create();
        const loginAction =
            this.userUtil.resolveLoginActivityLogAction(loginWith);
        const loginLogs = [
            this.activityLogService.prepare({
                action: loginAction,
                userId: user.id,
                createdBy: user.id,
            }),
        ];
        const outcome = await this.resolveLoginOutcome(
            user,
            device,
            loginFrom,
            loginWith,
            loginAt
        );
        if (!outcome.isTwoFactorEnable) {
            this.activityLogService.stagePrepared(loginLogs);
        } else if (outcome.twoFactor.isRequiredSetup) {
            const setupLogs = [
                this.activityLogService.prepare({
                    action: EnumActivityLogAction.userSetupTwoFactor,
                    userId: user.id,
                    createdBy: user.id,
                }),
            ];

            this.activityLogService.stagePrepared(setupLogs);
        }

        return outcome;
    }

    private async requestVerificationEmail(user: IUser): Promise<void> {
        // Sequential by design: gate before the work it guards; write must not run if an earlier step throws
        const isResendable =
            await this.userVerificationService.isEmailResendable(user);
        if (!isResendable) {
            return;
        }

        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userSendVerificationEmail,
                userId: user.id,
                createdBy: user.id,
            }),
        ];
        await this.userVerificationService.sendEmail(user.id, user.email);

        this.activityLogService.stagePrepared(activityLogs);
    }

    async execute({
        email,
        password,
        from,
        device,
    }: UserLoginRequestDto): Promise<IResponseReturn<IUserLoginOutcome>> {
        const deviceIdentity = this.deviceUtil.toIdentity(device);
        const attempt =
            await this.userAuthService.countCredentialAttempt(email);
        const lockoutLogs = attempt.lockoutStages.map(stage =>
            this.activityLogService.prepare(stage)
        );
        this.activityLogService.stagePrepared(lockoutLogs);

        this.userPasswordService.assertAttemptCounted(attempt.isAttemptCounted);

        // Sequential by design: gate before the work it guards
        const isMatch = await this.userAuthService.verifyCredential(
            attempt,
            password
        );
        if (!isMatch) {
            const failedLogs = [
                this.activityLogService.prepare({
                    action: EnumActivityLogAction.userLoginFailed,
                    userId: attempt.user.id,
                    createdBy: attempt.user.id,
                }),
            ];

            this.activityLogService.stagePrepared(failedLogs);
        }
        this.userAuthService.assertCredentialMatched(isMatch);

        const isUnverified = this.userUtil.isUnverified(attempt.user);
        if (isUnverified) {
            await this.requestVerificationEmail(attempt.user);
        }
        this.userAuthService.assertVerified(attempt.user);
        this.userAuthService.assertPasswordNotExpired(attempt.user);

        const outcome = await this.completeLogin(
            attempt.user,
            deviceIdentity,
            from,
            EnumUserLoginWith.credential
        );

        return { data: outcome };
    }
}
