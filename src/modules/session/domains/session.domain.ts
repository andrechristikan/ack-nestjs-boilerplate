import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    Prisma,
    Session,
} from '@generated/prisma-client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import { ISession } from '@modules/session/interfaces/session.interface';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { SessionCache } from '@modules/session/caches/session.cache';
import { SessionUtil } from '@modules/session/utils/session.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SessionDomain {
    constructor(
        private readonly sessionRepository: SessionRepository,
        private readonly sessionUtil: SessionUtil,
        private readonly sessionCache: SessionCache,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly databaseService: DatabaseService,
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

    /**
     * Reads the still-active sessions before their rows are revoked: the read filters on
     * active rows, so a caller that revokes first purges nothing and leaves live logins.
     */
    async deleteLoginsByDeviceOwnership(
        userId: string,
        deviceOwnershipId: string
    ): Promise<void> {
        const sessions =
            await this.sessionRepository.findActiveByDeviceOwnership(
                userId,
                deviceOwnershipId
            );
        await this.sessionCache.deleteAllLogins(userId, sessions);

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
    ): Promise<{ id: string }[]> {
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
    ): Promise<{ id: string }[]> {
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
        await Promise.all([
            this.databaseService.withTransaction(async tx => {
                await this.sessionRepository.revokeInTx(
                    tx,
                    userId,
                    sessionId,
                    userId,
                    revokedAt
                );
            }),
            this.sessionCache.deleteOneLogin(userId, sessionId),
        ]);

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
        const [removed] = await Promise.all([
            this.databaseService.withTransaction(async tx => {
                return this.sessionRepository.revokeByAdminInTx(
                    tx,
                    sessionId,
                    revokedBy,
                    revokedAt
                );
            }),
            this.sessionCache.deleteOneLogin(userId, sessionId),
        ]);

        const metadata = this.sessionUtil.mapActivityLogMetadata(removed);
        this.activityLogDomain.stage({
            action: EnumActivityLogAction.adminSessionRevoke,
            metadata,
        });
        this.activityLogDomain.stage({
            action: EnumActivityLogAction.userRevokeSessionByAdmin,
            userId,
            metadata,
        });

        return;
    }
}
