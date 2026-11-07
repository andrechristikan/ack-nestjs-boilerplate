import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { AuthJwtService } from '@modules/auth/services/auth.jwt.service';
import type {
    IAuthJwtRefreshTokenPayload,
    IAuthToken,
} from '@modules/auth/interfaces/auth.interface';
import { SessionService } from '@modules/session/services/session.service';
import { EnumSessionCacheUpdate } from '@modules/session/enums/session.enum';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { UserService } from '@modules/user/services/user.service';
import type { IUserLoginRefresh } from '@modules/user/interfaces/user.login.interface';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserRefreshUseCase implements IAppUseCase<
    [IUser, string],
    IResponseReturn<IAuthToken>
> {
    constructor(
        private readonly userService: UserService,
        private readonly sessionService: SessionService,
        private readonly authJwtService: AuthJwtService,
        private readonly activityLogService: ActivityLogService,
        private readonly sessionQueue: SessionQueue,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

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

    private async rotateSession(
        user: IUser,
        refreshToken: string
    ): Promise<IUserLoginRefresh> {
        const requestLog = this.sessionService.getRequestLog();
        const payload =
            this.authJwtService.payloadToken<IAuthJwtRefreshTokenPayload>(
                refreshToken
            );
        const oldJti = this.authJwtService.getRefreshJti(payload);
        const { sessionId, userId, loginFrom, loginWith } = payload;
        const { jti: newJti, tokens } = this.authJwtService.refreshToken(
            user,
            refreshToken
        );
        let isRotated: boolean;
        try {
            // Sequential by design: write must not run if an earlier step throws
            isRotated = await this.databaseService.withTransaction(async tx => {
                const isJtiUpdated = await this.sessionService.updateJtiInTx(
                    tx,
                    sessionId,
                    oldJti,
                    newJti
                );
                if (!isJtiUpdated) {
                    return false;
                }

                const now = this.helperDateService.create();
                await this.userService.updateLoginInTx(
                    tx,
                    userId,
                    loginFrom,
                    loginWith,
                    requestLog.ipAddress,
                    now
                );

                return true;
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                return { tokens: null, revoked: [] };
            }

            throw new AppUnknownException(err);
        }

        if (!isRotated) {
            const revoked = await this.sessionService.revokeIfActive(
                userId,
                sessionId
            );

            return { tokens: null, revoked };
        }

        const cacheUpdate = await this.sessionService.updateLogin(
            userId,
            sessionId,
            oldJti,
            newJti
        );
        if (cacheUpdate === EnumSessionCacheUpdate.mismatch) {
            const revoked = await this.sessionService.revokeIfActive(
                userId,
                sessionId
            );

            return { tokens: null, revoked };
        }

        if (cacheUpdate === EnumSessionCacheUpdate.absent) {
            await this.setLoginOrRevoke(userId, sessionId, newJti);
        }

        return { tokens, revoked: [] };
    }

    async execute(
        user: IUser,
        refreshToken: string
    ): Promise<IResponseReturn<IAuthToken>> {
        const refreshLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userRefreshToken,
            }),
        ];
        const reuseLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userRevokeSession,
            }),
        ];
        const { tokens, revoked } = await this.rotateSession(
            user,
            refreshToken
        );
        if (tokens === null) {
            await this.sessionQueue.purgeLogins(user.id, revoked);

            if (revoked.length > 0) {
                this.activityLogService.stagePrepared(reuseLogs);
            }
        }

        const refreshed = this.sessionService.getRefreshedTokens(tokens);

        this.activityLogService.stagePrepared(refreshLogs);

        return { data: refreshed };
    }
}
