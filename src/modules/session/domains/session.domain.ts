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
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import type {
    ISession,
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
    ): Promise<IResponsePagingReturn<ISession>> {
        return this.sessionRepository.findWithPaginationOffsetByAdmin(
            userId,
            pagination,
            isRevoked
        );
    }

    async getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.SessionWhereInput>
    ): Promise<IResponsePagingReturn<ISession>> {
        return this.sessionRepository.findActiveWithPaginationCursor(
            userId,
            pagination
        );
    }

    async deleteAllLogins(userId: string): Promise<void> {
        const sessions = await this.sessionRepository.findActive(userId);
        await this.sessionCache.deleteAllLogins(userId, sessions);

        return;
    }

    async deleteOneLogin(userId: string, sessionId: string): Promise<void> {
        const checkActive = await this.sessionRepository.findOneActive(
            userId,
            sessionId
        );
        if (!checkActive) {
            throw new SessionNotFoundException();
        }

        await this.sessionCache.deleteOneLogin(userId, sessionId);

        return;
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
    ): Promise<Session> {
        return this.sessionRepository.updateJtiInTx(tx, sessionId, jti);
    }

    async revokeInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        sessionId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<Session> {
        return this.sessionRepository.revokeInTx(
            tx,
            userId,
            sessionId,
            revokedBy,
            revokedAt
        );
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
        const checkActive = await this.sessionRepository.findOneActive(
            userId,
            sessionId
        );
        if (!checkActive) {
            throw new SessionNotFoundException();
        }

        const revokedAt = this.helperDateService.create();
        const revoked = await this.sessionRepository.revoke(
            userId,
            sessionId,
            userId,
            revokedAt
        );
        await this.purgeRevokedLogins(userId, [revoked]);

        this.activityLogDomain.stage({
            action: EnumActivityLogAction.userRevokeSession,
        });

        return;
    }

    async revokeByAdmin(
        userId: string,
        sessionId: string,
        revokedBy: string
    ): Promise<void> {
        const checkActive = await this.sessionRepository.findOneActive(
            userId,
            sessionId
        );
        if (!checkActive) {
            throw new SessionNotFoundException();
        }

        const revokedAt = this.helperDateService.create();
        const removed = await this.sessionRepository.revokeByAdmin(
            sessionId,
            revokedBy,
            revokedAt
        );
        await this.purgeRevokedLogins(userId, [removed]);

        this.activityLogDomain.stage({
            action: EnumActivityLogAction.adminSessionRevoke,
            metadata: this.sessionUtil.mapActivityLogActorMetadata(removed),
        });
        if (userId !== revokedBy) {
            this.activityLogDomain.stage({
                action: EnumActivityLogAction.userRevokeSessionByAdmin,
                userId,
                createdBy: revokedBy,
                metadata: this.sessionUtil.mapActivityLogTargetMetadata(
                    removed,
                    revokedBy
                ),
            });
        }

        return;
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
            await this.sessionCache.deleteAllLogins(userId, sessions);
        } catch (error: unknown) {
            this.logger.error(error, 'Failed to purge revoked session cache');
        }
    }

    /** Runs after the caller's transaction commits: purges exactly the revoked logins, then logs the pair when anything was revoked. */
    async finalizeRevokeAllByAdmin(
        userId: string,
        revokedBy: string,
        sessions: ISessionRef[]
    ): Promise<void> {
        await this.purgeRevokedLogins(userId, sessions);

        if (sessions.length === 0) {
            return;
        }

        this.activityLogDomain.stage({
            action: EnumActivityLogAction.adminSessionRevokeAll,
            metadata: {
                targetUserId: userId,
                sessionCount: sessions.length,
            },
        });
        if (userId !== revokedBy) {
            this.activityLogDomain.stage({
                action: EnumActivityLogAction.userRevokeAllSessionsByAdmin,
                userId,
                createdBy: revokedBy,
                metadata: {
                    actorUserId: revokedBy,
                    sessionCount: sessions.length,
                },
            });
        }
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

        await this.finalizeRevokeAllByAdmin(userId, revokedBy, sessions);
    }
}
