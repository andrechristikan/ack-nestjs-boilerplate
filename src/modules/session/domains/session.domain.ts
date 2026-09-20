import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import type { Session } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStagedEvent } from '@modules/activity-log/interfaces/activity-log.interface';
import { AuthJwtRefreshTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-refresh-token-invalid.exception';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import type {
    ISession,
    ISessionList,
    ISessionRef,
} from '@modules/session/interfaces/session.interface';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { SessionCache } from '@modules/session/caches/session.cache';
import { SessionUtil } from '@modules/session/utils/session.util';
import { UserNotSelfException } from '@modules/user/exceptions/user.not-self.exception';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SessionDomain {
    private readonly logger = new Logger(SessionDomain.name);

    constructor(
        private readonly sessionRepository: SessionRepository,
        private readonly sessionUtil: SessionUtil,
        private readonly sessionCache: SessionCache,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly helperDateService: HelperDateService
    ) {}

    async getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.SessionWhereInput>,
        isRevoked?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<ISessionList>> {
        return this.sessionRepository.findWithPaginationOffsetByAdmin(
            userId,
            pagination,
            isRevoked
        );
    }

    async getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.SessionWhereInput>
    ): Promise<IResponsePagingReturn<ISessionList>> {
        return this.sessionRepository.findActiveWithPaginationCursor(
            userId,
            pagination
        );
    }

    async validateActive(userId: string, sessionId: string): Promise<ISession> {
        const session = await this.sessionRepository.findOneActive(
            userId,
            sessionId
        );
        if (!session) {
            throw new SessionNotFoundException();
        }

        return session;
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

    async updateJtiInTx(
        tx: IDatabaseTransactionClient,
        sessionId: string,
        jti: string
    ): Promise<void> {
        const isUpdated = await this.sessionRepository.updateJtiInTx(
            tx,
            sessionId,
            jti
        );
        if (!isUpdated) {
            throw new AuthJwtRefreshTokenInvalidException();
        }
    }

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
    }

    async revokeActiveByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<ISessionRef[]> {
        return this.sessionRepository.revokeActiveByUserInTx(
            tx,
            userId,
            revokedBy,
            revokedAt
        );
    }

    async revokeByDeviceOwnershipInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceOwnershipId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<ISessionRef[]> {
        return this.sessionRepository.revokeByDeviceOwnershipInTx(
            tx,
            userId,
            deviceOwnershipId,
            revokedBy,
            revokedAt
        );
    }

    async revoke(userId: string, sessionId: string): Promise<void> {
        await this.validateActive(userId, sessionId);

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userRevokeSession,
            }),
        ];
        const revokedAt = this.helperDateService.create();
        const isRevoked = await this.sessionRepository.revoke(
            userId,
            sessionId,
            userId,
            revokedAt
        );
        if (!isRevoked) {
            throw new SessionNotFoundException();
        }

        await this.purgeRevokedLogins(userId, [{ id: sessionId }]);

        this.activityLogDomain.stagePrepared(events);
    }

    async revokeByAdmin(
        userId: string,
        sessionId: string,
        revokedBy: string
    ): Promise<void> {
        const session = await this.validateActive(userId, sessionId);

        const revokedAt = this.helperDateService.create();
        const actorMetadata = this.sessionUtil.mapActivityLogActorMetadata(
            session,
            revokedAt
        );
        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.adminSessionRevoke,
                metadata: actorMetadata,
            }),
        ];
        if (userId !== revokedBy) {
            const targetMetadata =
                this.sessionUtil.mapActivityLogTargetMetadata(
                    session,
                    revokedBy,
                    revokedAt
                );
            const revokedByAdminEvent = this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userRevokeSessionByAdmin,
                userId,
                createdBy: revokedBy,
                metadata: targetMetadata,
            });
            events.push(revokedByAdminEvent);
        }

        const isRevoked = await this.sessionRepository.revokeByAdmin(
            sessionId,
            revokedBy,
            revokedAt
        );
        if (!isRevoked) {
            throw new SessionNotFoundException();
        }

        await this.purgeRevokedLogins(userId, [{ id: sessionId }]);

        this.activityLogDomain.stagePrepared(events);
    }

    /**
     * Runs after the revoke is committed: purges exactly the revoked logins from the session
     * cache. A purge failure is logged and swallowed, so the committed revoke still succeeds.
     */
    async purgeRevokedLogins(
        userId: string,
        sessions: ISessionRef[]
    ): Promise<void> {
        try {
            await this.sessionCache.deleteLogins(userId, sessions);
        } catch (error: unknown) {
            this.logger.error(error, 'Failed to purge revoked session cache');
        }
    }

    /**
     * Runs after the revoke is committed: purges every session login of the user from the
     * cache. A purge failure is logged and swallowed, so the committed revoke still succeeds.
     */
    async purgeLoginsByUser(userId: string): Promise<void> {
        try {
            await this.sessionCache.deleteLoginsByUser(userId);
        } catch (error: unknown) {
            this.logger.error(error, 'Failed to purge user session cache');
        }
    }

    /** Prepares the admin revoke-all pair for a committed revoke; nothing when no session was revoked. */
    prepareRevokeAllByAdmin(
        userId: string,
        revokedBy: string,
        sessionCount: number
    ): IActivityLogStagedEvent[] {
        if (sessionCount === 0) {
            return [];
        }

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.adminSessionRevokeAll,
                metadata: {
                    targetUserId: userId,
                    sessionCount,
                },
            }),
        ];
        if (userId !== revokedBy) {
            const revokedAllByAdminEvent = this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userRevokeAllSessionsByAdmin,
                userId,
                createdBy: revokedBy,
                metadata: {
                    actorUserId: revokedBy,
                    sessionCount,
                },
            });
            events.push(revokedAllByAdminEvent);
        }

        return events;
    }

    /** Prepares the self revoke-all row of a whole-user revoke; `onError` keeps it on the error-path flush. */
    prepareRevokeAllSelf(
        userId: string,
        onError: boolean
    ): IActivityLogStagedEvent[] {
        return [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId,
                createdBy: userId,
                onError,
            }),
        ];
    }

    /** Runs after a whole-user revoke commits: purges every login of the user, then stages the prepared revoke-all events. */
    async finalizeRevokeAll(
        userId: string,
        events: IActivityLogStagedEvent[]
    ): Promise<void> {
        await this.purgeLoginsByUser(userId);

        this.activityLogDomain.stagePrepared(events);
    }

    async revokeAllByAdmin(userId: string, revokedBy: string): Promise<void> {
        if (userId === revokedBy) {
            throw new UserNotSelfException();
        }

        const revokedAt = this.helperDateService.create();
        const sessions = await this.sessionRepository.revokeActiveByUser(
            userId,
            revokedBy,
            revokedAt
        );
        if (sessions.length === 0) {
            throw new SessionNotFoundException();
        }

        const events = this.prepareRevokeAllByAdmin(
            userId,
            revokedBy,
            sessions.length
        );
        await this.finalizeRevokeAll(userId, events);
    }
}
