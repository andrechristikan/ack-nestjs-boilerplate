import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type {
    IRequestContext,
    IRequestLog,
} from '@common/request/interfaces/request.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { Session } from '@generated/prisma-client/client';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import type {
    IAuthJwtAccessContext,
    IAuthToken,
} from '@modules/auth/interfaces/auth.interface';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import { SessionRevokedException } from '@modules/session/exceptions/session.revoked.exception';
import type {
    ISessionList,
    ISessionLogin,
    ISessionRef,
} from '@modules/session/interfaces/session.interface';
import { SessionCache } from '@modules/session/caches/session.cache';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { SessionUtil } from '@modules/session/utils/session.util';
import type { IUserPurgeLoginsPayload } from '@modules/user/interfaces/user.interface';
import { UserAuthQueue } from '@modules/user/queues/user.auth.queue';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';
import { CacheService } from '@common/cache/services/cache.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import { SessionLoginCacheSchema } from '@modules/session/dtos/session.login-cache.dto';

@Injectable()
export class SessionService {
    private readonly idleTimeoutInMs: number;
    private readonly retentionInMs: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly sessionRepository: SessionRepository,
        private readonly sessionCache: SessionCache,
        private readonly cacheService: CacheService,
        private readonly helperDateService: HelperDateService,
        private readonly helperHashService: HelperHashService,
        private readonly outboxService: OutboxService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly userAuthQueue: UserAuthQueue,
        private readonly sessionUtil: SessionUtil
    ) {
        this.idleTimeoutInMs = this.configService.get<number>(
            'session.idleTimeoutInMs'
        )!;
        this.retentionInMs = this.configService.get<number>(
            'session.retentionInMs'
        )!;
    }

    private groupRefsByUser(
        sessions: ISessionRef[]
    ): IUserPurgeLoginsPayload[] {
        const grouped = new Map<string, ISessionRef[]>();
        for (const session of sessions) {
            const refs = grouped.get(session.userId) ?? [];
            refs.push(session);
            grouped.set(session.userId, refs);
        }

        return Array.from(grouped, ([userId, refs]) => ({
            userId,
            sessions: refs,
        }));
    }

    private async loadLogin(
        userId: string,
        sessionId: string,
        idleSince: Date
    ): Promise<ISessionLogin | null> {
        const session = await this.sessionRepository.findLoginById(
            userId,
            sessionId,
            idleSince
        );

        return session === null ? null : { jtiDigest: session.jtiDigest };
    }

    private async readLogin(
        userId: string,
        sessionId: string,
        key: string
    ): Promise<ISessionLogin | null> {
        const now = this.helperDateService.now();
        const idleSince = this.helperDateService.backward(
            now,
            Duration.fromObject({ milliseconds: this.idleTimeoutInMs })
        );

        return this.cacheService.readThrough(
            key,
            SessionLoginCacheSchema,
            this.sessionCache.loginCacheTtlInMs,
            () => this.loadLogin(userId, sessionId, idleSince)
        );
    }

    private mapActivityLogActorMetadata(
        session: ISessionList,
        timestamp: Date
    ): IActivityLogMetadata {
        return {
            targetUserId: session.userId,
            targetUsername: session.user.username,
            sessionId: session.id,
            timestamp,
        };
    }

    private mapActivityLogTargetMetadata(
        session: ISessionList,
        actorUserId: string,
        timestamp: Date
    ): IActivityLogMetadata {
        return {
            actorUserId,
            sessionId: session.id,
            timestamp,
        };
    }

    private async revokeActiveInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        exceptSessionId: string | null,
        revokedBy: string,
        revokedAt: Date
    ): Promise<ISessionRef[]> {
        const sessions = await this.sessionRepository.revokeActiveByUserInTx(
            tx,
            userId,
            exceptSessionId,
            revokedBy,
            revokedAt
        );
        if (sessions.length > 0) {
            const effect = this.userAuthQueue.purgeLoginsEffect(
                userId,
                sessions
            );
            await this.outboxService.addInTx(tx, effect);
        }

        return sessions;
    }

    async getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams,
        isRevoked?: Record<string, IPaginationEqual>
    ): Promise<IResponsePaginationReturn<ISessionList>> {
        return this.sessionRepository.findWithPaginationOffsetByAdmin(
            userId,
            pagination,
            isRevoked ?? null
        );
    }

    async getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePaginationReturn<ISessionList>> {
        const now = this.helperDateService.now();
        const idleSince = this.helperDateService.backward(
            now,
            Duration.fromObject({ milliseconds: this.idleTimeoutInMs })
        );

        return this.sessionRepository.findActiveWithPaginationCursor(
            userId,
            pagination,
            idleSince
        );
    }

    /** True when the login entry, read through from the live session row, holds the token's jti digest; a differing cached digest is invalidated and read through once more; a Redis connection error throws. */
    async isLoginActive(
        userId: string,
        sessionId: string,
        jti: string
    ): Promise<boolean> {
        const key = this.sessionCache.buildLoginKey(userId, sessionId);
        const jtiDigest = this.helperHashService.sha256Hash(jti);
        const login = await this.readLogin(userId, sessionId, key);
        if (login === null) {
            return false;
        }

        const isMatch = this.helperHashService.sha256Compare(
            login.jtiDigest,
            jtiDigest
        );
        if (isMatch) {
            return true;
        }

        await this.cacheService.invalidate([key]);
        const reloaded = await this.readLogin(userId, sessionId, key);
        if (reloaded === null) {
            return false;
        }

        return this.helperHashService.sha256Compare(
            reloaded.jtiDigest,
            jtiDigest
        );
    }

    async purgeExpired(): Promise<number> {
        const now = this.helperDateService.now();
        const retention = this.helperDateService.createDuration({
            milliseconds: this.retentionInMs,
        });
        const threshold = this.helperDateService.backward(now, retention);

        return this.sessionRepository.deleteExpiredBefore(threshold);
    }

    /** Invalidates the login key of each session; a Redis connection error throws. */
    async deleteLogins(userId: string, sessions: ISessionRef[]): Promise<void> {
        const keys = sessions.map(session =>
            this.sessionCache.buildLoginKey(userId, session.id)
        );
        await this.cacheService.invalidate(keys);
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        sessionId: string,
        deviceOwnershipId: string,
        jti: string,
        expiredAt: Date,
        requestLog: IRequestLog
    ): Promise<Session> {
        const jtiDigest = this.helperHashService.sha256Hash(jti);

        return this.sessionRepository.createInTx(
            tx,
            userId,
            sessionId,
            deviceOwnershipId,
            jtiDigest,
            expiredAt,
            requestLog
        );
    }

    getRefreshedTokens(tokens: IAuthToken | null): IAuthToken {
        if (tokens === null) {
            throw new SessionRevokedException();
        }

        return tokens;
    }

    /** Answers whether the session row is unrevoked, inside its expiry and idle bounds, and holds the digest of the jti. */
    async existsLiveByJti(sessionId: string, jti: string): Promise<boolean> {
        const jtiDigest = this.helperHashService.sha256Hash(jti);
        const now = this.helperDateService.now();
        const idleSince = this.helperDateService.backward(
            now,
            Duration.fromObject({ milliseconds: this.idleTimeoutInMs })
        );

        return this.sessionRepository.existsLiveByJtiDigest(
            sessionId,
            jtiDigest,
            idleSince
        );
    }

    async updateJtiInTx(
        tx: IDatabaseTransactionClient,
        sessionId: string,
        oldJti: string,
        newJti: string
    ): Promise<boolean> {
        const oldJtiDigest = this.helperHashService.sha256Hash(oldJti);
        const newJtiDigest = this.helperHashService.sha256Hash(newJti);
        const now = this.helperDateService.now();
        const idleSince = this.helperDateService.backward(
            now,
            Duration.fromObject({ milliseconds: this.idleTimeoutInMs })
        );

        return this.sessionRepository.updateJtiInTx(
            tx,
            sessionId,
            oldJtiDigest,
            newJtiDigest,
            idleSince
        );
    }

    /** Revokes a session still inside its expiry and idle bounds on the caller's transaction and adds its cache purge row; false when no live row matched. */
    async revokeReusedInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        sessionId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<boolean> {
        const idleSince = this.helperDateService.backward(
            revokedAt,
            Duration.fromObject({ milliseconds: this.idleTimeoutInMs })
        );
        const isRevoked = await this.sessionRepository.revokeLiveInTx(
            tx,
            userId,
            sessionId,
            revokedBy,
            revokedAt,
            idleSince
        );
        if (!isRevoked) {
            return false;
        }

        const effect = this.userAuthQueue.purgeLoginsEffect(userId, [
            { id: sessionId, userId },
        ]);
        await this.outboxService.addInTx(tx, effect);

        return true;
    }

    /** Revokes the session on the caller's transaction and adds its cache purge row; no match throws SessionNotFoundException. */
    async revokeInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        sessionId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<void> {
        const isRevoked = await this.sessionRepository.revokeInTx(
            tx,
            userId,
            sessionId,
            revokedBy,
            revokedAt
        );
        if (!isRevoked) {
            throw new SessionNotFoundException();
        }

        const effect = this.userAuthQueue.purgeLoginsEffect(userId, [
            { id: sessionId, userId },
        ]);
        await this.outboxService.addInTx(tx, effect);
    }

    /** Revokes the user's active sessions on the caller's transaction and adds their cache purge row when any was revoked; returns the revoked refs. */
    async revokeActiveByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<ISessionRef[]> {
        return this.revokeActiveInTx(tx, userId, null, revokedBy, revokedAt);
    }

    /** Revokes the user's active sessions but the excepted one on the caller's transaction and adds their cache purge row when any was revoked; returns the revoked refs. */
    async revokeActiveByUserExceptInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        exceptSessionId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<ISessionRef[]> {
        return this.revokeActiveInTx(
            tx,
            userId,
            exceptSessionId,
            revokedBy,
            revokedAt
        );
    }

    /** Revokes the unrevoked sessions of a device ownership on the caller's transaction and adds their cache purge row when any was revoked; returns the revoked refs. */
    async revokeByDeviceOwnershipInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceOwnershipId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<ISessionRef[]> {
        const sessions =
            await this.sessionRepository.revokeByDeviceOwnershipInTx(
                tx,
                userId,
                deviceOwnershipId,
                revokedBy,
                revokedAt
            );
        if (sessions.length > 0) {
            const effect = this.userAuthQueue.purgeLoginsEffect(
                userId,
                sessions
            );
            await this.outboxService.addInTx(tx, effect);
        }

        return sessions;
    }

    /** Revokes the unrevoked sessions of the device ownerships on the caller's transaction and adds, per affected user, the cache purge row and a userSessionRevokedByDeviceLogin entry; adds nothing when none was revoked. */
    async revokeByDeviceOwnershipIdsInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        deviceOwnershipIds: string[],
        revokedBy: string,
        revokedAt: Date
    ): Promise<void> {
        const sessions =
            await this.sessionRepository.revokeByDeviceOwnershipIdsInTx(
                tx,
                deviceOwnershipIds,
                revokedBy,
                revokedAt
            );

        const grouped = this.groupRefsByUser(sessions);
        if (grouped.length > 0) {
            const effects: IOutboxEffect[] = [];
            for (const { userId, sessions: refs } of grouped) {
                const metadata =
                    this.sessionUtil.mapActivityLogRevokeAllTargetMetadata(
                        revokedBy,
                        refs.length
                    );
                const purge = this.userAuthQueue.purgeLoginsEffect(
                    userId,
                    refs
                );
                const entry = this.activityLogQueue.recordEffect(
                    requestContext,
                    apiKeyContext,
                    null,
                    null,
                    {
                        action: EnumActivityLogAction.userSessionRevokedByDeviceLogin,
                        userId,
                        createdBy: revokedBy,
                        metadata,
                    }
                );
                effects.push(purge, entry);
            }
            await this.outboxService.addManyInTx(tx, effects);
        }
    }

    /** Revokes the session as an admin on the caller's transaction, adds its cache purge row and activity entries, and returns it; no match throws SessionNotFoundException. */
    async revokeByAdminInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userId: string,
        sessionId: string,
        revokedAt: Date
    ): Promise<ISessionList> {
        const revokedBy = authContext.userId;
        const session = await this.sessionRepository.revokeByAdminInTx(
            tx,
            userId,
            sessionId,
            revokedBy,
            revokedAt
        );

        const actorMetadata = this.mapActivityLogActorMetadata(
            session,
            revokedAt
        );
        const effects: IOutboxEffect[] = [
            this.userAuthQueue.purgeLoginsEffect(userId, [
                { id: sessionId, userId },
            ]),
            this.activityLogQueue.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminSessionRevoked,
                    metadata: actorMetadata,
                }
            ),
        ];
        if (userId !== revokedBy) {
            const targetMetadata = this.mapActivityLogTargetMetadata(
                session,
                revokedBy,
                revokedAt
            );
            const targetEntry = this.activityLogQueue.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userSessionRevokedByAdmin,
                    userId,
                    createdBy: revokedBy,
                    metadata: targetMetadata,
                }
            );
            effects.push(targetEntry);
        }
        await this.outboxService.addManyInTx(tx, effects);

        return session;
    }

    /** Revokes every active session of the user as an admin on the caller's transaction, adds their cache purge row and the activity entries, and returns the revoked refs; none revoked throws SessionNotFoundException. */
    async revokeAllByAdminInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userId: string,
        revokedAt: Date
    ): Promise<ISessionRef[]> {
        const revokedBy = authContext.userId;
        const sessions = await this.revokeActiveByUserInTx(
            tx,
            userId,
            revokedBy,
            revokedAt
        );
        if (sessions.length === 0) {
            throw new SessionNotFoundException();
        }

        const actorMetadata =
            this.sessionUtil.mapActivityLogRevokeAllActorMetadata(
                userId,
                sessions.length
            );
        const actorEntry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.adminAllSessionsRevoked,
                metadata: actorMetadata,
            }
        );
        const targetMetadata =
            this.sessionUtil.mapActivityLogRevokeAllTargetMetadata(
                revokedBy,
                sessions.length
            );
        const targetEntry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.userAllSessionsRevokedByAdmin,
                userId,
                createdBy: revokedBy,
                metadata: targetMetadata,
            }
        );
        await this.outboxService.addManyInTx(tx, [actorEntry, targetEntry]);

        return sessions;
    }
}
