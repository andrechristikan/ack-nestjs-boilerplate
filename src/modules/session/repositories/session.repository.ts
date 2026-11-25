import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    SessionListSelect,
    SessionRefSelect,
} from '@modules/session/constants/session.constant';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import type {
    ISessionList,
    ISessionRef,
} from '@modules/session/interfaces/session.interface';
import type { ISessionRepository } from '@modules/session/interfaces/session.repository.interface';
import { Injectable } from '@nestjs/common';
import type { Session } from '@generated/prisma-client/client';

@Injectable()
export class SessionRepository implements ISessionRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService,
        private readonly paginationService: PaginationService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async findWithPaginationOffsetByAdmin(
        userId: string,
        { where, ...others }: IPaginationQueryOffsetParams,
        isRevoked: Record<string, IPaginationEqual> | null
    ): Promise<IResponsePaginationReturn<ISessionList>> {
        return this.paginationService.offset(
            this.databaseService.client.session,
            {
                ...others,
                where: {
                    ...where,
                    ...isRevoked,
                    userId,
                },
                select: SessionListSelect,
            }
        );
    }

    async findActiveWithPaginationCursor(
        userId: string,
        { where, ...others }: IPaginationQueryCursorParams,
        idleSince: Date
    ): Promise<IResponsePaginationReturn<ISessionList>> {
        const now = this.helperDateService.now();

        return this.paginationService.cursor(
            this.databaseService.client.session,
            {
                ...others,
                where: {
                    ...where,
                    userId,
                    isRevoked: false,
                    expiredAt: { gte: now },
                    lastActiveAt: { gte: idleSince },
                },
                select: SessionListSelect,
            }
        );
    }

    async findLoginById(
        userId: string,
        sessionId: string,
        idleSince: Date
    ): Promise<Session | null> {
        const now = this.helperDateService.now();

        return this.databaseService.client.session.findFirst({
            where: {
                id: sessionId,
                userId,
                isRevoked: false,
                expiredAt: { gte: now },
                lastActiveAt: { gte: idleSince },
            },
        });
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        sessionId: string,
        deviceOwnershipId: string,
        jtiDigest: string,
        expiredAt: Date,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<Session> {
        const plainUserAgent = this.databaseUtil.toPlainObject(userAgent);
        const plainGeoLocation = this.databaseUtil.toPlainObject(geoLocation);
        const now = this.helperDateService.now();

        return tx.session.create({
            data: {
                id: sessionId,
                userId,
                jtiDigest,
                expiredAt,
                lastActiveAt: now,
                isRevoked: false,
                ipAddress,
                deviceOwnershipId,
                userAgent: plainUserAgent,
                geoLocation: plainGeoLocation,
                createdBy: userId,
            },
        });
    }

    async existsLiveByJtiDigest(
        sessionId: string,
        jtiDigest: string,
        idleSince: Date
    ): Promise<boolean> {
        const now = this.helperDateService.now();
        const session = await this.databaseService.client.session.findFirst({
            where: {
                id: sessionId,
                jtiDigest,
                isRevoked: false,
                expiredAt: { gte: now },
                lastActiveAt: { gte: idleSince },
            },
            select: SessionRefSelect,
        });

        return session !== null;
    }

    async updateJtiInTx(
        tx: IDatabaseTransactionClient,
        sessionId: string,
        oldJtiDigest: string,
        newJtiDigest: string,
        idleSince: Date
    ): Promise<boolean> {
        const now = this.helperDateService.now();
        try {
            const { count } = await tx.session.updateMany({
                where: {
                    id: sessionId,
                    jtiDigest: oldJtiDigest,
                    isRevoked: false,
                    expiredAt: {
                        gte: now,
                    },
                    lastActiveAt: { gte: idleSince },
                },
                data: { jtiDigest: newJtiDigest, lastActiveAt: now },
            });

            return count > 0;
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new SessionNotFoundException()
            );
        }
    }

    async revokeInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        sessionId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<boolean> {
        try {
            const { count } = await tx.session.updateMany({
                where: {
                    id: sessionId,
                    userId,
                    isRevoked: false,
                },
                data: {
                    isRevoked: true,
                    revokedAt,
                    revokedById: revokedBy,
                },
            });

            return count > 0;
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new SessionNotFoundException()
            );
        }
    }

    async revokeLiveInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        sessionId: string,
        revokedBy: string,
        revokedAt: Date,
        idleSince: Date
    ): Promise<boolean> {
        try {
            const { count } = await tx.session.updateMany({
                where: {
                    id: sessionId,
                    userId,
                    isRevoked: false,
                    expiredAt: { gte: revokedAt },
                    lastActiveAt: { gte: idleSince },
                },
                data: {
                    isRevoked: true,
                    revokedAt,
                    revokedById: revokedBy,
                },
            });

            return count > 0;
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new SessionNotFoundException()
            );
        }
    }

    async revokeByAdminInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        sessionId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<ISessionList> {
        try {
            return await tx.session.update({
                where: {
                    id: sessionId,
                    userId,
                    isRevoked: false,
                },
                data: {
                    isRevoked: true,
                    revokedAt,
                    revokedById: revokedBy,
                },
                select: SessionListSelect,
            });
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new SessionNotFoundException()
            );
        }
    }

    async revokeActiveByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        exceptSessionId: string | null,
        revokedBy: string,
        revokedAt: Date
    ): Promise<ISessionRef[]> {
        const sessions = await tx.session.findMany({
            where: {
                userId,
                isRevoked: false,
                ...(exceptSessionId !== null && {
                    id: { not: exceptSessionId },
                }),
            },
            select: SessionRefSelect,
        });
        if (sessions.length === 0) {
            return [];
        }

        await tx.session.updateMany({
            where: {
                id: { in: sessions.map(session => session.id) },
                userId,
                isRevoked: false,
            },
            data: {
                isRevoked: true,
                revokedAt,
                revokedById: revokedBy,
                updatedBy: revokedBy,
            },
        });

        return sessions;
    }

    async revokeByDeviceOwnershipInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceOwnershipId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<ISessionRef[]> {
        const sessions = await tx.session.findMany({
            where: {
                userId,
                deviceOwnershipId,
                isRevoked: false,
            },
            select: SessionRefSelect,
        });
        if (sessions.length === 0) {
            return [];
        }

        await tx.session.updateMany({
            where: {
                id: { in: sessions.map(session => session.id) },
                userId,
                isRevoked: false,
            },
            data: {
                isRevoked: true,
                revokedAt,
                revokedById: revokedBy,
                updatedBy: revokedBy,
            },
        });

        return sessions;
    }

    async revokeByDeviceOwnershipIdsInTx(
        tx: IDatabaseTransactionClient,
        deviceOwnershipIds: string[],
        revokedBy: string,
        revokedAt: Date
    ): Promise<ISessionRef[]> {
        const sessions = await tx.session.findMany({
            where: {
                deviceOwnershipId: { in: deviceOwnershipIds },
                isRevoked: false,
            },
            select: SessionRefSelect,
        });
        if (sessions.length === 0) {
            return [];
        }

        await tx.session.updateMany({
            where: {
                id: { in: sessions.map(session => session.id) },
                isRevoked: false,
            },
            data: {
                isRevoked: true,
                revokedAt,
                revokedById: revokedBy,
                updatedBy: revokedBy,
            },
        });

        return sessions;
    }

    async deleteExpiredBefore(threshold: Date): Promise<number> {
        const { count } = await this.databaseService.client.session.deleteMany({
            where: { expiredAt: { lt: threshold } },
        });

        return count;
    }
}
