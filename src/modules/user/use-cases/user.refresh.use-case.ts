import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { AuthJwtService } from '@modules/auth/services/auth.jwt.service';
import type {
    IAuthJwtRefreshContext,
    IAuthJwtRefreshTokenPayload,
    IAuthToken,
} from '@modules/auth/interfaces/auth.interface';
import { DeviceService } from '@modules/device/services/device.service';
import { SessionService } from '@modules/session/services/session.service';
import { UserService } from '@modules/user/services/user.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type {
    IUser,
    IUserContext,
} from '@modules/user/interfaces/user.interface';

@Injectable()
export class UserRefreshUseCase implements IAppUseCase<
    [IRequestContext, IApiKeyContext, IAuthJwtRefreshContext, IUserContext],
    IResponseReturn<IAuthToken>
> {
    constructor(
        private readonly userService: UserService,
        private readonly sessionService: SessionService,
        private readonly deviceService: DeviceService,
        private readonly authJwtService: AuthJwtService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService
    ) {}

    private async revokeReused(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtRefreshContext
    ): Promise<void> {
        const { sessionId, userId } = authContext;
        const now = this.helperDateService.now();
        await this.databaseService.withTransaction(async tx => {
            const isRevoked = await this.sessionService.revokeReusedInTx(
                tx,
                userId,
                sessionId,
                userId,
                now
            );
            if (isRevoked) {
                const revokeEntry = this.activityLogQueue.recordEffect(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    null,
                    { action: EnumActivityLogAction.userSessionRevoked }
                );
                await this.outboxService.addInTx(tx, revokeEntry);
            }
        });
    }

    private async rotateSession(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtRefreshContext,
        user: IUser,
        { loginFrom }: IAuthJwtRefreshTokenPayload,
        oldJti: string
    ): Promise<IAuthToken | null> {
        const { requestLog } = requestContext;
        const { token: refreshToken } = authContext;
        const { sessionId, userId, loginWith, deviceOwnershipId } = authContext;
        const { jti: newJti, tokens } = this.authJwtService.refreshToken(
            user,
            refreshToken
        );
        // Sequential by design: a statement whose failure is the answer, awaited before an unrelated write
        return this.databaseService.withTransaction(async tx => {
            const isJtiUpdated = await this.sessionService.updateJtiInTx(
                tx,
                sessionId,
                oldJti,
                newJti
            );
            if (!isJtiUpdated) {
                return null;
            }

            const now = this.helperDateService.now();
            await Promise.all([
                this.userService.updateLoginInTx(
                    tx,
                    userId,
                    loginFrom,
                    loginWith,
                    requestLog.ipAddress,
                    now,
                    false
                ),
                this.deviceService.touchOwnershipInTx(
                    tx,
                    userId,
                    deviceOwnershipId,
                    now
                ),
            ]);
            const entry = this.activityLogQueue.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.userTokenRefreshed }
            );
            await this.outboxService.addInTx(tx, entry);

            return tokens;
        });
    }

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtRefreshContext,
        userContext: IUserContext
    ): Promise<IResponseReturn<IAuthToken>> {
        const payload =
            this.authJwtService.payloadToken<IAuthJwtRefreshTokenPayload>(
                authContext.token
            );
        const oldJti = this.authJwtService.getRefreshJti(payload);
        const isLive = await this.sessionService.existsLiveByJti(
            authContext.sessionId,
            oldJti
        );
        if (!isLive) {
            await this.revokeReused(requestContext, apiKeyContext, authContext);
            const revoked = this.sessionService.getRefreshedTokens(null);

            return { data: revoked };
        }

        const tokens = await this.rotateSession(
            requestContext,
            apiKeyContext,
            authContext,
            userContext.user,
            payload,
            oldJti
        );

        const refreshed = this.sessionService.getRefreshedTokens(tokens);

        return { data: refreshed };
    }
}
