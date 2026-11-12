import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type {
    IRequestContextSnapshot,
    IRequestContextUser,
} from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { AuthJwtService } from '@modules/auth/services/auth.jwt.service';
import type {
    IAuthJwtRefreshTokenPayload,
    IAuthToken,
} from '@modules/auth/interfaces/auth.interface';
import { SessionService } from '@modules/session/services/session.service';
import { EnumSessionCacheUpdate } from '@modules/session/enums/session.enum';
import { UserService } from '@modules/user/services/user.service';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserRefreshUseCase implements IAppUseCase<
    [IRequestContextUser, string],
    IResponseReturn<IAuthToken>
> {
    constructor(
        private readonly userService: UserService,
        private readonly sessionService: SessionService,
        private readonly authJwtService: AuthJwtService,
        private readonly activityLogService: ActivityLogService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    private async rotateSession(
        snapshot: IRequestContextSnapshot,
        user: IUser,
        refreshToken: string
    ): Promise<IAuthToken | null> {
        const { requestLog } = snapshot;
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
            isRotated = await this.outboxService.withTransaction(async tx => {
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
                const entry = this.activityLogService.recordEffect(snapshot, {
                    action: EnumActivityLogAction.userRefreshToken,
                });
                await this.outboxService.addInTx(tx, entry);

                return true;
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                return null;
            }

            throw new AppUnknownException(err);
        }

        if (!isRotated) {
            await this.sessionService.revokeIfActive(
                snapshot,
                userId,
                sessionId
            );

            return null;
        }

        const cacheUpdate = await this.sessionService.updateLogin(
            userId,
            sessionId,
            oldJti,
            newJti
        );
        if (cacheUpdate === EnumSessionCacheUpdate.mismatch) {
            await this.sessionService.revokeIfActive(
                snapshot,
                userId,
                sessionId
            );

            return null;
        }

        if (cacheUpdate === EnumSessionCacheUpdate.absent) {
            await this.sessionService.setLoginOrRevoke(
                userId,
                sessionId,
                newJti
            );
        }

        return tokens;
    }

    async execute(
        context: IRequestContextUser,
        refreshToken: string
    ): Promise<IResponseReturn<IAuthToken>> {
        const tokens = await this.rotateSession(
            context.snapshot,
            context.user,
            refreshToken
        );
        const refreshed = this.sessionService.getRefreshedTokens(tokens);

        return { data: refreshed };
    }
}
