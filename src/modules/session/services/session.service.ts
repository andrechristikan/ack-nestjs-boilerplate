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
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Session } from '@generated/prisma-client/client';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import type { IDeviceRemoveResult } from '@modules/device/interfaces/device.interface';
import { DeviceService } from '@modules/device/services/device.service';
import {
    EnumSessionProcess,
    EnumSessionQueue,
} from '@modules/session/enums/session.enum';
import type { EnumSessionCacheUpdate } from '@modules/session/enums/session.enum';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import { SessionRevokedException } from '@modules/session/exceptions/session.revoked.exception';
import type {
    ISession,
    ISessionCache,
    ISessionList,
    ISessionPurgeLoginsPayload,
    ISessionRef,
    ISessionUserRef,
} from '@modules/session/interfaces/session.interface';
import { SessionCache } from '@modules/session/caches/session.cache';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { UserNotSelfException } from '@modules/user/exceptions/user.not-self.exception';
import { Injectable } from '@nestjs/common';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IOutboxEffect } from '@modules/outbox/interfaces/outbox.interface';
import { OutboxService } from '@modules/outbox/services/outbox.service';

@Injectable()
export class SessionService {
    constructor(
        private readonly sessionRepository: SessionRepository,
        private readonly sessionCache: SessionCache,
        private readonly helperDateService: HelperDateService,
        private readonly requestStoreService: RequestStoreService,
        private readonly deviceService: DeviceService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly outboxService: OutboxService
    ) {}

    private purgeLoginsEffect(
        userId: string,
        sessions: ISessionRef[]
    ): IOutboxEffect {
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

    async getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.SessionWhereInput>,
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
        pagination: IPaginationQueryCursorParams<Prisma.SessionWhereInput>
    ): Promise<IResponsePaginationReturn<ISessionList>> {
        return this.sessionRepository.findActiveWithPaginationCursor(
            userId,
            pagination
        );
    }

    /** Reads the cached login entry; a store failure throws, so the caller does not mistake an outage for a revoked session. */
    async getLogin(
        userId: string,
        sessionId: string
    ): Promise<ISessionCache | null> {
        return this.sessionCache.getLogin(userId, sessionId);
    }

    /** Stores the login entry for the access-token lifetime, then re-reads the session row and deletes the entry when the row was revoked meanwhile; a store failure throws. */
    async setLogin(
        userId: string,
        sessionId: string,
        jti: string
    ): Promise<void> {
        // Sequential by design: side effects whose order is part of the contract (the re-read follows the write it checks)
        await this.sessionCache.setLogin(userId, sessionId, jti);

        const isActive = await this.sessionRepository.existsActiveById(
            userId,
            sessionId
        );
        if (!isActive) {
            await this.sessionCache.deleteLogins(userId, [{ id: sessionId }]);
        }
    }

    /** Stores the login entry; on a store failure revokes the session with its cache purge row and rethrows. */
    async setLoginOrRevoke(
        userId: string,
        sessionId: string,
        jti: string
    ): Promise<void> {
        try {
            await this.setLogin(userId, sessionId, jti);
        } catch (error: unknown) {
            await this.revokeIfActive(userId, sessionId);

            if (error instanceof AppBaseException) {
                throw error;
            }

            throw new AppUnknownException(error);
        }
    }

    /** Rotates the cached jti by compare-and-set; answers updated, absent, or mismatch. */
    async updateLogin(
        userId: string,
        sessionId: string,
        oldJti: string,
        newJti: string
    ): Promise<EnumSessionCacheUpdate> {
        return this.sessionCache.updateLogin(userId, sessionId, oldJti, newJti);
    }

    async deleteLogins(userId: string, sessions: ISessionRef[]): Promise<void> {
        await this.sessionCache.deleteLogins(userId, sessions);
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
        return this.sessionRepository.createInTx(
            tx,
            userId,
            sessionId,
            deviceOwnershipId,
            jti,
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

    getRequestLog(): IRequestLog {
        const requestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey);
        if (requestLog === null) {
            throw new RequestContextMissingException(RequestLogStoreKey);
        }

        return requestLog;
    }

    async updateJtiInTx(
        tx: IDatabaseTransactionClient,
        sessionId: string,
        oldJti: string,
        newJti: string
    ): Promise<boolean> {
        return this.sessionRepository.updateJtiInTx(
            tx,
            sessionId,
            oldJti,
            newJti
        );
    }

    /** Revokes the session as its own user with its cache purge row in one transaction; returns the revoked ref, or an empty list when it was already revoked or a write conflict lost. */
    async revokeIfActive(
        userId: string,
        sessionId: string
    ): Promise<ISessionRef[]> {
        const revokedAt = this.helperDateService.create();

        try {
            await this.outboxService.withTransaction(async tx =>
                this.revokeInTx(tx, userId, sessionId, userId, revokedAt)
            );
        } catch (err: unknown) {
            if (err instanceof SessionNotFoundException) {
                return [];
            }

            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                return [];
            }

            throw new AppUnknownException(err);
        }

        return [{ id: sessionId }];
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
        const sessions = await this.sessionRepository.revokeActiveByUserInTx(
            tx,
            userId,
            revokedBy,
            revokedAt
        );
        if (sessions.length > 0) {
            const effect = this.purgeLoginsEffect(userId, sessions);
            await this.outboxService.addInTx(tx, effect);
        }

        return sessions;
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

    /** Revokes the session as its own user with its cache purge row in one transaction; a write conflict throws SessionNotFoundException. */
    async revoke(userId: string, sessionId: string): Promise<void> {
        const revokedAt = this.helperDateService.create();

        try {
            await this.outboxService.withTransaction(async tx =>
                this.revokeInTx(tx, userId, sessionId, userId, revokedAt)
            );
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

    /** Revokes the session as an admin with its cache purge row in one transaction; a write conflict throws SessionNotFoundException. */
    async revokeByAdmin(
        userId: string,
        sessionId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<ISession> {
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

    /** Revokes every active session of the user with one cache purge row in one transaction; none revoked or a write conflict throws SessionNotFoundException. */
    async revokeAllByAdmin(
        userId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<ISessionRef[]> {
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

    /** Revokes the live sessions of a device ownership with their cache purge row and removes the ownership in one transaction; a write conflict throws DeviceNotFoundException. */
    async removeDeviceOwnership(
        userId: string,
        deviceOwnershipId: string,
        removedBy: string
    ): Promise<IDeviceRemoveResult> {
        const now = this.helperDateService.create();

        try {
            return await this.outboxService.withTransaction(async tx => {
                const revokedSessions = await this.revokeByDeviceOwnershipInTx(
                    tx,
                    userId,
                    deviceOwnershipId,
                    removedBy,
                    now
                );
                const deviceOwnership =
                    await this.deviceService.removeOwnershipInTx(
                        tx,
                        userId,
                        deviceOwnershipId,
                        removedBy,
                        now
                    );

                return { deviceOwnership, revokedSessions };
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

    mapActivityLogActorMetadata(
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

    mapActivityLogTargetMetadata(
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
}
