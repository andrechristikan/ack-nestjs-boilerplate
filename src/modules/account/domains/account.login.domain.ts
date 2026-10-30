import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import { AccountDomain } from '@modules/account/domains/account.domain';
import type { IAccountRefresh } from '@modules/account/interfaces/account.interface';
import { AuthJwtDomain } from '@modules/auth/domains/auth.jwt.domain';
import { AuthTwoFactorDomain } from '@modules/auth/domains/auth.two-factor.domain';
import { AuthJwtRefreshTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-refresh-token-invalid.exception';
import type {
    IAuthJwtRefreshTokenPayload,
    IAuthToken,
} from '@modules/auth/interfaces/auth.interface';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { EnumSessionCacheUpdate } from '@modules/session/enums/session.enum';
import { SessionRevokedException } from '@modules/session/exceptions/session.revoked.exception';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import type {
    IUser,
    IUserLoginOutcome,
} from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { Duration } from 'luxon';

/** Owns the login, refresh, and logout transactions that span the device, session, and user modules. */
@Injectable()
export class AccountLoginDomain {
    constructor(
        private readonly userDomain: UserDomain,
        private readonly userTwoFactorDomain: UserTwoFactorDomain,
        private readonly accountDomain: AccountDomain,
        private readonly deviceDomain: DeviceDomain,
        private readonly deviceUtil: DeviceUtil,
        private readonly sessionDomain: SessionDomain,
        private readonly authJwtDomain: AuthJwtDomain,
        private readonly authTwoFactorDomain: AuthTwoFactorDomain,
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService,
        private readonly requestStoreService: RequestStoreService,
        private readonly sessionQueue: SessionQueue,
        private readonly notificationQueue: NotificationQueue
    ) {}

    private getRequestLog(): IRequestLog {
        const requestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey);
        if (requestLog === null) {
            throw new RequestContextMissingException(RequestLogStoreKey);
        }

        return requestLog;
    }

    /** Creates the session and stamps the login in one transaction, then signs the tokens and caches the login entry; the sessions of a repeat device are revoked and their cache purge is enqueued with the new-device notice. */
    async createTokenAndSession(
        user: IUser,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        loginAt: Date
    ): Promise<IAuthToken> {
        const requestLog = this.getRequestLog();
        const { sessionId, jti } = this.authJwtDomain.createLoginIdentifiers();
        const expiredAt = this.helperDateService.forward(
            loginAt,
            Duration.fromObject({
                seconds:
                    this.authJwtDomain.jwtRefreshTokenExpirationTimeInSeconds,
            })
        );
        const now = this.helperDateService.create();
        // Sequential by design: write must not run if an earlier step throws
        const recipient =
            await this.accountDomain.getNotificationRecipientOfUser(
                user,
                EnumNotificationKind.newDeviceLogin
            );
        const { isNewDevice, revoked, deviceOwnershipId } =
            await this.databaseService.withTransaction(async tx => {
                const notificationProvider =
                    this.deviceUtil.resolveNotificationProvider(
                        device.platform ?? null
                    );
                const upserted = await this.deviceDomain.upsertForLoginInTx(
                    tx,
                    user.id,
                    device,
                    notificationProvider,
                    now
                );
                let revokedSessions: ISessionRef[] = [];
                if (!upserted.isNewDevice) {
                    revokedSessions =
                        await this.sessionDomain.revokeByDeviceOwnershipInTx(
                            tx,
                            user.id,
                            upserted.deviceOwnership.id,
                            user.id,
                            now
                        );
                }
                await this.sessionDomain.createInTx(
                    tx,
                    user.id,
                    sessionId,
                    upserted.deviceOwnership.id,
                    jti,
                    expiredAt,
                    requestLog
                );
                await this.userDomain.updateLoginInTx(
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
                    deviceOwnershipId: upserted.deviceOwnership.id,
                };
            });

        const tokens = this.authJwtDomain.createTokens(
            user,
            { sessionId, jti, deviceOwnershipId, loginAt },
            loginFrom,
            loginWith
        );
        const promises = [
            this.sessionDomain.setLogin(user.id, sessionId, jti),
            this.sessionQueue.purgeLogins(user.id, revoked),
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

        return tokens;
    }

    /** Logs a verified user in: tokens directly, or the two-factor challenge (with a fresh setup when two-factor still requires one). */
    async login(
        user: IUser,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        loginAt: Date
    ): Promise<IUserLoginOutcome> {
        const { lastWorkspaceId, lastWorkspaceChangedAt } = user;
        if (!user.twoFactor?.enabled) {
            const tokens = await this.createTokenAndSession(
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

        const challengePromise = this.authTwoFactorDomain.createChallenge({
            userId: user.id,
            device,
            loginFrom,
            loginWith,
        });
        if (user.twoFactor.requiredSetup) {
            const [
                { challengeToken, expiresInMs },
                { encryptedSecret, otpauthUrl, secret },
            ] = await Promise.all([
                challengePromise,
                this.authTwoFactorDomain.setupTwoFactor(user.id, user.email),
            ]);
            await this.userTwoFactorDomain.saveSetup(user.id, encryptedSecret);

            return {
                isTwoFactorEnable: true,
                lastWorkspaceId,
                lastWorkspaceChangedAt,
                twoFactor: {
                    isRequiredSetup: true,
                    challengeToken,
                    challengeExpiresInMs: expiresInMs,
                    backupCodesRemaining: user.twoFactor.backupCodes.length,
                    otpauthUrl,
                    secret,
                },
            };
        }

        const { challengeToken, expiresInMs } = await challengePromise;

        return {
            isTwoFactorEnable: true,
            lastWorkspaceId,
            lastWorkspaceChangedAt,
            twoFactor: {
                isRequiredSetup: false,
                challengeToken,
                challengeExpiresInMs: expiresInMs,
                backupCodesRemaining: user.twoFactor.backupCodes.length,
            },
        };
    }

    /** Rotates the session by compare-and-set on the presented jti; a replayed token revokes the session and answers no tokens with the ref to purge. */
    async refresh(user: IUser, refreshToken: string): Promise<IAccountRefresh> {
        const requestLog = this.getRequestLog();
        const {
            sessionId,
            userId,
            jti: oldJti,
            loginFrom,
            loginWith,
        } = this.authJwtDomain.payloadToken<IAuthJwtRefreshTokenPayload>(
            refreshToken
        );
        if (!oldJti) {
            throw new AuthJwtRefreshTokenInvalidException();
        }

        const session = await this.sessionDomain.findOneActive(
            userId,
            sessionId
        );
        if (!session) {
            throw new SessionRevokedException();
        }

        try {
            const { jti: newJti, tokens } = this.authJwtDomain.refreshToken(
                user,
                refreshToken
            );
            // Sequential by design: write must not run if an earlier step throws
            const isRotated = await this.databaseService.withTransaction(
                async tx => {
                    const isJtiUpdated = await this.sessionDomain.updateJtiInTx(
                        tx,
                        sessionId,
                        oldJti,
                        newJti
                    );
                    if (!isJtiUpdated) {
                        return false;
                    }

                    const now = this.helperDateService.create();
                    await this.userDomain.updateLoginInTx(
                        tx,
                        userId,
                        loginFrom,
                        loginWith,
                        requestLog.ipAddress,
                        now
                    );

                    return true;
                }
            );
            if (!isRotated) {
                const revoked = await this.sessionDomain.revokeOnReuse(
                    userId,
                    sessionId
                );

                return { tokens: null, revoked };
            }

            const cacheUpdate = await this.sessionDomain.updateLogin(
                userId,
                sessionId,
                oldJti,
                newJti
            );
            if (cacheUpdate === EnumSessionCacheUpdate.mismatch) {
                const revoked = await this.sessionDomain.revokeOnReuse(
                    userId,
                    sessionId
                );

                return { tokens: null, revoked };
            }

            if (cacheUpdate === EnumSessionCacheUpdate.absent) {
                await this.sessionDomain.setLogin(userId, sessionId, newJti);
            }

            return { tokens, revoked: [] };
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    getRefreshedTokens({ tokens }: IAccountRefresh): IAuthToken {
        if (tokens === null) {
            throw new SessionRevokedException();
        }

        return tokens;
    }

    /** Revokes the session and clears the device notification token in one transaction; answers the session ref to purge. */
    async logout(
        userId: string,
        sessionId: string,
        deviceOwnershipId: string
    ): Promise<ISessionRef[]> {
        try {
            // Sequential by design: gate before the work it guards
            await this.sessionDomain.validateActive(userId, sessionId);

            const now = this.helperDateService.create();
            // Sequential by design: write must not run if an earlier step throws
            await this.databaseService.withTransaction(async tx => {
                await this.sessionDomain.revokeInTx(
                    tx,
                    userId,
                    sessionId,
                    userId,
                    now
                );
                await this.deviceDomain.clearNotificationInTx(
                    tx,
                    userId,
                    deviceOwnershipId,
                    userId,
                    now
                );
            });

            return [{ id: sessionId }];
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }
}
