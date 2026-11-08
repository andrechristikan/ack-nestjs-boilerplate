import { HelperDateService } from '@common/helper/services/helper.date.service';
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
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { SessionService } from '@modules/session/services/session.service';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type { UserLoginVerifyTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserLoginVerifyTwoFactorUseCase implements IAppUseCase<
    [UserLoginVerifyTwoFactorRequestDto],
    IResponseReturn<IAuthToken>
> {
    constructor(
        private readonly userAuthService: UserAuthService,
        private readonly userTwoFactorService: UserTwoFactorService,
        private readonly notificationService: NotificationService,
        private readonly sessionService: SessionService,
        private readonly authTwoFactorService: AuthTwoFactorService,
        private readonly activityLogService: ActivityLogService,
        private readonly sessionQueue: SessionQueue,
        private readonly notificationQueue: NotificationQueue,
        private readonly userUtil: UserUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    /** Temporary: UserAuthService.createTokenAndSession recording the login effects in its transaction (phases 3B and 3C). */
    private async startSession(
        user: IUser,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        loginAt: Date
    ): Promise<IAuthToken> {
        // Sequential by design: write must not run if an earlier step throws
        const recipient = await this.notificationService.getRecipient(
            user,
            EnumNotificationKind.newDeviceLogin
        );
        const session = await this.userAuthService.createTokenAndSession(
            user,
            device,
            loginFrom,
            loginWith,
            loginAt
        );
        const promises = [
            this.sessionService.setLoginOrRevoke(
                user.id,
                session.sessionId,
                session.jti
            ),
            this.sessionQueue.purgeLogins(user.id, session.revoked),
            ...session.affected.map(({ userId, sessions }) =>
                this.sessionQueue.purgeLogins(userId, sessions)
            ),
        ];
        if (session.isNewDevice) {
            const loginAtIso = this.helperDateService.formatToIso(loginAt);
            const newDeviceLoginSent =
                this.notificationQueue.sendNewDeviceLogin(
                    recipient,
                    {
                        requestLog: session.requestLog,
                        loginFrom,
                        loginWith,
                        loginAt: loginAtIso,
                    },
                    session.sessionId
                );
            promises.push(newDeviceLoginSent);
        }

        await Promise.all(promises);

        if (session.revokeStages.length > 0) {
            const revokeLogs = session.revokeStages.map(stage =>
                this.activityLogService.prepare(stage)
            );

            this.activityLogService.stagePrepared(revokeLogs);
        }

        return session.tokens;
    }

    /** Temporary: one UserTwoFactorService method recording the attempt through recordEffect (phase 3D). */
    private async assertTwoFactorAttemptCounted(user: IUser): Promise<void> {
        const attempt = await this.userTwoFactorService.countAttempt(user);
        const lockoutLogs = attempt.lockoutStages.map(stage =>
            this.activityLogService.prepare(stage)
        );
        this.activityLogService.stagePrepared(lockoutLogs);

        this.userTwoFactorService.assertAttemptCounted(
            attempt.isAttemptCounted
        );
    }

    async execute({
        challengeToken,
        code,
        backupCode,
        method,
    }: UserLoginVerifyTwoFactorRequestDto): Promise<
        IResponseReturn<IAuthToken>
    > {
        const challenge =
            await this.authTwoFactorService.getChallenge(challengeToken);

        const user = await this.userTwoFactorService.getOneForLoginVerify(
            challenge.userId
        );
        // Sequential by design: gate before the work it guards; write must not run if an earlier step throws
        await this.assertTwoFactorAttemptCounted(user);
        const verified = await this.userTwoFactorService.verify(user, {
            code: code ?? null,
            backupCode: backupCode ?? null,
            method,
        });
        await this.authTwoFactorService.consumeChallenge(challengeToken);
        const verifyLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userVerifyTwoFactor,
                userId: user.id,
                createdBy: user.id,
            }),
        ];
        await this.userTwoFactorService.recordVerification(user, verified);

        this.activityLogService.stagePrepared(verifyLogs);

        const loginAction = this.userUtil.resolveLoginActivityLogAction(
            challenge.loginWith
        );
        const loginLogs = [
            this.activityLogService.prepare({
                action: loginAction,
                userId: user.id,
                createdBy: user.id,
            }),
        ];
        const loginAt = this.helperDateService.create();
        const tokens = await this.startSession(
            user,
            challenge.device,
            challenge.loginFrom,
            challenge.loginWith,
            loginAt
        );

        this.activityLogService.stagePrepared(loginLogs);

        return { data: tokens };
    }
}
