import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { AuthJwtService } from '@modules/auth/services/auth.jwt.service';
import { AuthTwoFactorService } from '@modules/auth/services/auth.two-factor.service';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { DeviceService } from '@modules/device/services/device.service';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { SessionService } from '@modules/session/services/session.service';
import type {
    ISessionPurgeLoginsPayload,
    ISessionRef,
} from '@modules/session/interfaces/session.interface';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { SessionUtil } from '@modules/session/utils/session.util';
import { UserService } from '@modules/user/services/user.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type { UserLoginVerifyTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';
import { Duration } from 'luxon';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserLoginVerifyTwoFactorUseCase implements IAppUseCase<
    [UserLoginVerifyTwoFactorRequestDto],
    IResponseReturn<IAuthToken>
> {
    constructor(
        private readonly userService: UserService,
        private readonly userTwoFactorService: UserTwoFactorService,
        private readonly notificationService: NotificationService,
        private readonly deviceService: DeviceService,
        private readonly sessionService: SessionService,
        private readonly authJwtService: AuthJwtService,
        private readonly authTwoFactorService: AuthTwoFactorService,
        private readonly authUtil: AuthUtil,
        private readonly activityLogService: ActivityLogService,
        private readonly sessionQueue: SessionQueue,
        private readonly sessionUtil: SessionUtil,
        private readonly notificationQueue: NotificationQueue,
        private readonly userUtil: UserUtil,
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService
    ) {}

    private async createTokenAndSession(
        user: IUser,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        loginAt: Date
    ): Promise<IAuthToken> {
        const requestLog = this.sessionService.getRequestLog();
        const { sessionId, jti } = this.authUtil.createLoginIdentifiers();
        const expiredAt = this.helperDateService.forward(
            loginAt,
            Duration.fromObject({
                seconds:
                    this.authJwtService.jwtRefreshTokenExpirationTimeInSeconds,
            })
        );
        const now = this.helperDateService.create();
        // Sequential by design: write must not run if an earlier step throws
        const recipient = await this.notificationService.getRecipient(
            user,
            EnumNotificationKind.newDeviceLogin
        );
        const { isNewDevice, revoked, affected, deviceOwnershipId } =
            await this.databaseService.withTransaction(async tx => {
                const upserted = await this.deviceService.upsertForLoginInTx(
                    tx,
                    user.id,
                    device,
                    now
                );
                let revokedSessions: ISessionRef[] = [];
                if (!upserted.isNewDevice) {
                    revokedSessions =
                        await this.sessionService.revokeByDeviceOwnershipInTx(
                            tx,
                            user.id,
                            upserted.deviceOwnership.id,
                            user.id,
                            now
                        );
                }
                const otherOwnershipIds =
                    await this.deviceService.getOtherOwnershipIdsByDeviceInTx(
                        tx,
                        upserted.device.id,
                        user.id
                    );
                let affectedSessions: ISessionPurgeLoginsPayload[] = [];
                if (otherOwnershipIds.length > 0) {
                    affectedSessions =
                        await this.sessionService.revokeByDeviceOwnershipIdsInTx(
                            tx,
                            otherOwnershipIds,
                            user.id,
                            now
                        );
                }
                await this.sessionService.createInTx(
                    tx,
                    user.id,
                    sessionId,
                    upserted.deviceOwnership.id,
                    jti,
                    expiredAt,
                    requestLog
                );
                await this.userService.updateLoginInTx(
                    tx,
                    user.id,
                    loginFrom,
                    loginWith,
                    requestLog.ipAddress,
                    now
                );

                return {
                    isNewDevice: upserted.isNewDevice,
                    revoked: revokedSessions,
                    affected: affectedSessions,
                    deviceOwnershipId: upserted.deviceOwnership.id,
                };
            });

        const tokens = this.authJwtService.createTokens(
            user,
            { sessionId, jti, deviceOwnershipId, loginAt },
            loginFrom,
            loginWith
        );
        const promises = [
            this.setLoginOrRevoke(user.id, sessionId, jti),
            this.sessionQueue.purgeLogins(user.id, revoked),
            ...affected.map(({ userId, sessions }) =>
                this.sessionQueue.purgeLogins(userId, sessions)
            ),
        ];
        if (isNewDevice) {
            const loginAtIso = this.helperDateService.formatToIso(loginAt);
            const newDeviceLoginSent =
                this.notificationQueue.sendNewDeviceLogin(
                    recipient,
                    {
                        requestLog,
                        loginFrom,
                        loginWith,
                        loginAt: loginAtIso,
                    },
                    sessionId
                );
            promises.push(newDeviceLoginSent);
        }

        await Promise.all(promises);

        if (affected.length > 0) {
            const prepareRevokeLog = ({
                userId,
                sessions,
            }: ISessionPurgeLoginsPayload): IActivityLogStaged => {
                const metadata =
                    this.sessionUtil.mapActivityLogRevokeAllTargetMetadata(
                        user.id,
                        sessions.length
                    );

                return this.activityLogService.prepare({
                    action: EnumActivityLogAction.userRevokeSessionByDeviceLogin,
                    userId,
                    createdBy: user.id,
                    metadata,
                });
            };
            this.activityLogService.stagePrepared(
                affected.map(prepareRevokeLog)
            );
        }

        return tokens;
    }

    private async setLoginOrRevoke(
        userId: string,
        sessionId: string,
        jti: string
    ): Promise<void> {
        try {
            await this.sessionService.setLogin(userId, sessionId, jti);
        } catch (error: unknown) {
            const revoked = await this.sessionService.revokeIfActive(
                userId,
                sessionId
            );
            await this.sessionQueue.purgeLogins(userId, revoked);

            if (error instanceof AppBaseException) {
                throw error;
            }

            throw new AppUnknownException(error);
        }
    }

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
        // Sequential by design: gate before the work it guards
        await this.assertTwoFactorAttemptCounted(user);
        // Sequential by design: the attempt is counted before the code is checked
        const verified = await this.userTwoFactorService.verify(user, {
            code: code ?? null,
            backupCode: backupCode ?? null,
            method,
        });
        // Sequential by design: the claim follows a successful verification and precedes the session it guards
        await this.authTwoFactorService.consumeChallenge(challengeToken);
        const verifyLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userVerifyTwoFactor,
                userId: user.id,
                createdBy: user.id,
            }),
        ];
        // Sequential by design: write must not run if an earlier step throws
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
        const tokens = await this.createTokenAndSession(
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
