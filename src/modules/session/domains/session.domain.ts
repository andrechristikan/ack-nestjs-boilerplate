import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Session } from '@generated/prisma-client/client';
import type { EnumSessionCacheUpdate } from '@modules/session/enums/session.enum';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import type {
    ISession,
    ISessionCache,
    ISessionList,
    ISessionRef,
} from '@modules/session/interfaces/session.interface';
import { SessionCache } from '@modules/session/caches/session.cache';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { UserNotSelfException } from '@modules/user/exceptions/user.not-self.exception';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SessionDomain {
    constructor(
        private readonly sessionRepository: SessionRepository,
        private readonly sessionCache: SessionCache,
        private readonly helperDateService: HelperDateService
    ) {}

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

    /** Stores the login entry for the access-token lifetime; a store failure throws. */
    async setLogin(
        userId: string,
        sessionId: string,
        jti: string
    ): Promise<void> {
        await this.sessionCache.setLogin(userId, sessionId, jti);
    }

    /** Rotates the cached jti by compare-and-set and answers the outcome. */
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

    async findOneActive(
        userId: string,
        sessionId: string
    ): Promise<ISession | null> {
        return this.sessionRepository.findOneActive(userId, sessionId);
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

    /** Revokes a session whose refresh token was replayed, as its own user; returns the ref to purge, none when it was already revoked. */
    async revokeOnReuse(
        userId: string,
        sessionId: string
    ): Promise<ISessionRef[]> {
        const revokedAt = this.helperDateService.create();
        const isRevoked = await this.sessionRepository.revoke(
            userId,
            sessionId,
            userId,
            revokedAt
        );

        return isRevoked ? [{ id: sessionId }] : [];
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
        // Sequential by design: gate before the work it guards
        await this.validateActive(userId, sessionId);

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
    }

    async revokeByAdmin(
        userId: string,
        sessionId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<ISession> {
        // Sequential by design: gate before the work it guards
        const session = await this.validateActive(userId, sessionId);

        const isRevoked = await this.sessionRepository.revokeByAdmin(
            sessionId,
            revokedBy,
            revokedAt
        );
        if (!isRevoked) {
            throw new SessionNotFoundException();
        }

        return session;
    }

    assertNotSelf(userId: string, revokedBy: string): void {
        if (userId === revokedBy) {
            throw new UserNotSelfException();
        }
    }

    async revokeAllByAdmin(
        userId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<ISessionRef[]> {
        const sessions = await this.sessionRepository.revokeActiveByUser(
            userId,
            revokedBy,
            revokedAt
        );
        if (sessions.length === 0) {
            throw new SessionNotFoundException();
        }

        return sessions;
    }
}
