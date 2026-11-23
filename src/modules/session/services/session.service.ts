import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
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
import type { Prisma, Session } from '@generated/prisma-client/client';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type {
    IAuthJwtAccessContext,
    IAuthToken,
} from '@modules/auth/interfaces/auth.interface';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import type { IDeviceRemoveResult } from '@modules/device/interfaces/device.interface';
import { DeviceService } from '@modules/device/services/device.service';
import { DeviceUtil } from '@modules/device/utils/device.util';
import {
    EnumSessionProcess,
    EnumSessionQueue,
} from '@modules/session/enums/session.enum';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import { SessionRevokedException } from '@modules/session/exceptions/session.revoked.exception';
import type {
    ISession,
    ISessionList,
    ISessionLogin,
    ISessionPurgeLoginsPayload,
    ISessionRef,
    ISessionUserRef,
} from '@modules/session/interfaces/session.interface';
import { SessionCache } from '@modules/session/caches/session.cache';
import { SessionLoginCacheSchema } from '@modules/session/constants/session.constant';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { SessionUtil } from '@modules/session/utils/session.util';
import { UserNotSelfException } from '@modules/user/exceptions/user.not-self.exception';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { CacheService } from '@common/cache/services/cache.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import type { ISessionPurgeLoginsEffect } from '@modules/session/interfaces/session.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';

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
        private readonly deviceService: DeviceService,
        private readonly deviceUtil: DeviceUtil,
        private readonly databaseUtil: DatabaseUtil,
        private readonly outboxService: OutboxService,
        private readonly activityLogService: ActivityLogService,
        private readonly sessionUtil: SessionUtil
    ) {
        this.idleTimeoutInMs = this.configService.get<number>(
            'session.idleTimeoutInMs'
        )!;
        this.retentionInMs = this.configService.get<number>(
            'session.retentionInMs'
        )!;
    }

    private purgeLoginsEffect(
        userId: string,
        sessions: ISessionRef[]
    ): ISessionPurgeLoginsEffect {
        return {
            queue: EnumSessionQueue.session,
            name: EnumSessionProcess.purgeLogins,
            data: { userId, sessions },
            priority: EnumQueuePriority.high,
            idempotencyKey: null,
        };
    }

    private groupRefsByUser(
        sessions: ISessionUserRef[]
    ): ISessionPurgeLoginsPayload[] {
        const grouped = new Map<string, ISessionRef[]>();
        for (const { id, userId } of sessions) {
            const refs = grouped.get(userId) ?? [];
            refs.push({ id });
            grouped.set(userId, refs);
        }

        return Array.from(grouped, ([userId, refs]) => ({
            userId,
            sessions: refs,
        }));
    }

    private async readLogin(
        userId: string,
        sessionId: string,
        key: string
    ): Promise<ISessionLogin | null> {
        const now = this.helperDateService.create();
        const idleSince = this.helperDateService.backward(
            now,
            Duration.fromObject({ milliseconds: this.idleTimeoutInMs })
        );

        return this.cacheService.readThrough(
            key,
            SessionLoginCacheSchema,
            this.sessionCache.loginCacheTtlInMs,
            () =>
                this.sessionRepository.findLoginById(
                    userId,
                    sessionId,
                    idleSince
                )
        );
    }

    private mapActivityLogActorMetadata(
        session: ISession,
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
        session: ISession,
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
            const effect = this.purgeLoginsEffect(userId, sessions);
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
        const now = this.helperDateService.create();
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

    /** True when the session row is live and holds the token's jti; a differing cached digest is invalidated and the row read once more; a Redis connection error throws. */
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

    /** Deletes the sessions that expired longer ago than session.retentionInMs; returns the count. */
    async purgeExpired(): Promise<number> {
        const now = this.helperDateService.create();
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

    async updateJtiInTx(
        tx: IDatabaseTransactionClient,
        sessionId: string,
        oldJti: string,
        newJti: string
    ): Promise<boolean> {
        const oldJtiDigest = this.helperHashService.sha256Hash(oldJti);
        const newJtiDigest = this.helperHashService.sha256Hash(newJti);
        const now = this.helperDateService.create();
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

        const effect = this.purgeLoginsEffect(userId, [{ id: sessionId }]);
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

        const effect = this.purgeLoginsEffect(userId, [{ id: sessionId }]);
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

    /** Revokes the user's active sessions with their cache purge row, then every device ownership, on the caller's transaction; returns the revoked session refs. */
    async revokeAllByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<ISessionRef[]> {
        const sessions = await this.revokeActiveByUserInTx(
            tx,
            userId,
            revokedBy,
            revokedAt
        );
        await this.deviceService.revokeAllByUserInTx(
            tx,
            userId,
            revokedBy,
            revokedAt
        );

        return sessions;
    }

    /** Revokes the live sessions of a device ownership on the caller's transaction and adds their cache purge row when any was revoked; returns the revoked refs. */
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
            const effect = this.purgeLoginsEffect(userId, sessions);
            await this.outboxService.addInTx(tx, effect);
        }

        return sessions;
    }

    /** Revokes the live sessions of the device ownerships on the caller's transaction and adds one cache purge row per affected user; returns the revoked refs grouped per user. */
    async revokeByDeviceOwnershipIdsInTx(
        tx: IDatabaseTransactionClient,
        deviceOwnershipIds: string[],
        revokedBy: string,
        revokedAt: Date
    ): Promise<ISessionPurgeLoginsPayload[]> {
        const sessions =
            await this.sessionRepository.revokeByDeviceOwnershipIdsInTx(
                tx,
                deviceOwnershipIds,
                revokedBy,
                revokedAt
            );

        const grouped = this.groupRefsByUser(sessions);
        if (grouped.length > 0) {
            const effects = grouped.map(group =>
                this.purgeLoginsEffect(group.userId, group.sessions)
            );
            await this.outboxService.addManyInTx(tx, effects);
        }

        return grouped;
    }

    /** Revokes the live sessions of a device ownership with their cache purge row, then removes the ownership, on the caller's transaction; returns the removed ownership and the revoked refs. */
    async removeDeviceOwnershipInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceOwnershipId: string,
        removedBy: string,
        now: Date,
        additionalWhere: Prisma.DeviceOwnershipWhereInput | null
    ): Promise<IDeviceRemoveResult> {
        const revokedSessions = await this.revokeByDeviceOwnershipInTx(
            tx,
            userId,
            deviceOwnershipId,
            removedBy,
            now
        );
        const deviceOwnership = await this.deviceService.removeOwnershipInTx(
            tx,
            userId,
            deviceOwnershipId,
            removedBy,
            now,
            additionalWhere
        );

        return { deviceOwnership, revokedSessions };
    }

    /** Revokes the session as an admin with its cache purge row and activity entries in one transaction; a write conflict throws SessionNotFoundException. */
    async revokeByAdmin(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userId: string,
        sessionId: string,
        revokedAt: Date
    ): Promise<ISession> {
        const revokedBy = authContext.userId;
        try {
            return await this.outboxService.withTransaction(async tx => {
                const session = await this.sessionRepository.revokeByAdminInTx(
                    tx,
                    userId,
                    sessionId,
                    revokedBy,
                    revokedAt
                );
                if (session === null) {
                    throw new SessionNotFoundException();
                }

                const effect = this.purgeLoginsEffect(userId, [
                    { id: sessionId },
                ]);
                await this.outboxService.addInTx(tx, effect);

                const actorMetadata = this.mapActivityLogActorMetadata(
                    session,
                    revokedAt
                );
                const actorEntry = this.activityLogService.recordEffect(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    null,
                    {
                        action: EnumActivityLogAction.adminSessionRevoke,
                        metadata: actorMetadata,
                    }
                );
                await this.outboxService.addInTx(tx, actorEntry);

                if (userId !== revokedBy) {
                    const targetMetadata = this.mapActivityLogTargetMetadata(
                        session,
                        revokedBy,
                        revokedAt
                    );
                    const targetEntry = this.activityLogService.recordEffect(
                        requestContext,
                        apiKeyContext,
                        authContext,
                        null,
                        {
                            action: EnumActivityLogAction.userRevokeSessionByAdmin,
                            userId,
                            createdBy: revokedBy,
                            metadata: targetMetadata,
                        }
                    );
                    await this.outboxService.addInTx(tx, targetEntry);
                }

                return session;
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new SessionNotFoundException();
            }

            throw new AppUnknownException(err);
        }
    }

    assertNotSelf(userId: string, revokedBy: string): void {
        if (userId === revokedBy) {
            throw new UserNotSelfException();
        }
    }

    /** Revokes every active session of the user with one cache purge row and the activity entries in one transaction; none revoked or a write conflict throws SessionNotFoundException. */
    async revokeAllByAdmin(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userId: string,
        revokedAt: Date
    ): Promise<ISessionRef[]> {
        const revokedBy = authContext.userId;
        try {
            return await this.outboxService.withTransaction(async tx => {
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
                const actorEntry = this.activityLogService.recordEffect(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    null,
                    {
                        action: EnumActivityLogAction.adminSessionRevokeAll,
                        metadata: actorMetadata,
                    }
                );
                const targetMetadata =
                    this.sessionUtil.mapActivityLogRevokeAllTargetMetadata(
                        revokedBy,
                        sessions.length
                    );
                const targetEntry = this.activityLogService.recordEffect(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    null,
                    {
                        action: EnumActivityLogAction.userRevokeAllSessionsByAdmin,
                        userId,
                        createdBy: revokedBy,
                        metadata: targetMetadata,
                    }
                );
                await this.outboxService.addManyInTx(tx, [
                    actorEntry,
                    targetEntry,
                ]);

                return sessions;
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new SessionNotFoundException();
            }

            throw new AppUnknownException(err);
        }
    }

    /** Revokes the live sessions of a device ownership with their cache purge row and removes the ownership as an admin, adding the activity entries, in one transaction; a write conflict throws DeviceNotFoundException. */
    async removeDeviceOwnershipByAdmin(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userId: string,
        deviceOwnershipId: string,
        additionalWhere: Prisma.DeviceOwnershipWhereInput | null
    ): Promise<void> {
        const removedBy = authContext.userId;
        const now = this.helperDateService.create();

        try {
            await this.outboxService.withTransaction(async tx => {
                const { deviceOwnership, revokedSessions } =
                    await this.removeDeviceOwnershipInTx(
                        tx,
                        userId,
                        deviceOwnershipId,
                        removedBy,
                        now,
                        additionalWhere
                    );

                const actorMetadata =
                    this.deviceUtil.mapActivityLogActorMetadata(
                        deviceOwnership,
                        revokedSessions.length
                    );
                const actorEntry = this.activityLogService.recordEffect(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    null,
                    {
                        action: EnumActivityLogAction.adminDeviceRemove,
                        metadata: actorMetadata,
                    }
                );
                await this.outboxService.addInTx(tx, actorEntry);

                if (userId !== removedBy) {
                    const targetMetadata =
                        this.deviceUtil.mapActivityLogTargetMetadata(
                            deviceOwnership,
                            removedBy,
                            revokedSessions.length
                        );
                    const targetEntry = this.activityLogService.recordEffect(
                        requestContext,
                        apiKeyContext,
                        authContext,
                        null,
                        {
                            action: EnumActivityLogAction.userRemoveDeviceByAdmin,
                            userId,
                            createdBy: removedBy,
                            metadata: targetMetadata,
                        }
                    );
                    await this.outboxService.addInTx(tx, targetEntry);
                }
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new DeviceNotFoundException();
            }

            throw new AppUnknownException(err);
        }
    }
}
