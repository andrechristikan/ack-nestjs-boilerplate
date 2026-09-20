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
import { SessionListSelect } from '@modules/session/constants/session.constant';
import type {
    ISession,
    ISessionList,
    ISessionRef,
} from '@modules/session/interfaces/session.interface';
import { UserRefSelect } from '@modules/user/constants/user.constant';
import type { ISessionRepository } from '@modules/session/interfaces/session.repository.interface';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client/client';
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
        {
            where,
            ...others
        }: IPaginationQueryOffsetParams<Prisma.SessionWhereInput>,
        isRevoked?: Record<string, IPaginationEqual>
    ): Promise<IResponsePaginationReturn<ISessionList>> {
        return this.paginationService.offset<
            ISessionList,
            Prisma.SessionWhereInput
        >(this.databaseService.client.session, {
            ...others,
            where: {
                ...where,
                ...isRevoked,
                userId,
            },
            select: SessionListSelect,
        });
    }

    async findActiveWithPaginationCursor(
        userId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.SessionWhereInput>
    ): Promise<IResponsePaginationReturn<ISessionList>> {
        return this.paginationService.cursor<
            ISessionList,
            Prisma.SessionWhereInput
        >(this.databaseService.client.session, {
            ...others,
            where: {
                ...where,
                userId,
                isRevoked: false,
            },
            select: SessionListSelect,
        });
    }

    async findOneActive(
        userId: string,
        sessionId: string
    ): Promise<ISession | null> {
        const today = this.helperDateService.create();

        return this.databaseService.client.session.findFirst({
            where: {
                id: sessionId,
                userId,
                expiredAt: {
                    gte: today,
                },
                isRevoked: false,
            },
            include: {
                user: {
                    select: UserRefSelect,
                },
                revokedBy: {
                    select: UserRefSelect,
                },
            },
        });
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        sessionId: string,
        deviceOwnershipId: string,
        jti: string,
        expiredAt: Date,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<Session> {
        const plainUserAgent = this.databaseUtil.toPlainObject(userAgent);
        const plainGeoLocation = this.databaseUtil.toPlainObject(geoLocation);

        return tx.session.create({
            data: {
                id: sessionId,
                userId,
                jti,
                expiredAt,
                isRevoked: false,
                ipAddress,
                deviceOwnershipId,
                userAgent: plainUserAgent,
                geoLocation: plainGeoLocation,
                createdBy: userId,
            },
        });
    }

    async updateJtiInTx(
        tx: IDatabaseTransactionClient,
        sessionId: string,
        jti: string
    ): Promise<boolean> {
        const now = this.helperDateService.create();
        const { count } = await tx.session.updateMany({
            where: {
                id: sessionId,
                isRevoked: false,
                expiredAt: {
                    gte: now,
                },
            },
            data: { jti },
        });

        return count > 0;
    }

    async revokeInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        sessionId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<boolean> {
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
    }

    async revoke(
        userId: string,
        sessionId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<boolean> {
        const { count } = await this.databaseService.client.session.updateMany({
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
    }

    async revokeByAdmin(
        sessionId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<boolean> {
        const { count } = await this.databaseService.client.session.updateMany({
            where: {
                id: sessionId,
                isRevoked: false,
            },
            data: {
                isRevoked: true,
                revokedAt,
                revokedById: revokedBy,
            },
        });

        return count > 0;
    }

    async revokeActiveByUser(
        userId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<ISessionRef[]> {
        return this.databaseService.withTransaction(async tx =>
            this.revokeActiveByUserInTx(tx, userId, revokedBy, revokedAt)
        );
    }

    async revokeActiveByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<ISessionRef[]> {
        const sessions = await tx.session.findMany({
            where: {
                userId,
                isRevoked: false,
                expiredAt: { gte: revokedAt },
            },
            select: { id: true },
        });
        await tx.session.updateMany({
            where: {
                id: { in: sessions.map(session => session.id) },
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
                expiredAt: { gte: revokedAt },
            },
            select: { id: true },
        });
        await tx.session.updateMany({
            where: {
                id: { in: sessions.map(session => session.id) },
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
}
