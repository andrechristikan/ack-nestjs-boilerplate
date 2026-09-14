import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ISession } from '@modules/session/interfaces/session.interface';
import { UserRefSelect } from '@modules/user/constants/user.constant';
import { ISessionRepository } from '@modules/session/interfaces/session.repository.interface';
import { Injectable } from '@nestjs/common';
import { Prisma, Session } from '@generated/prisma-client';

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
    ): Promise<IResponsePagingReturn<ISession>> {
        return this.paginationService.offset<
            ISession,
            Prisma.SessionWhereInput
        >(this.databaseService.client.session, {
            ...others,
            where: {
                ...where,
                ...isRevoked,
                userId,
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

    async findActiveWithPaginationCursor(
        userId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.SessionWhereInput>
    ): Promise<IResponsePagingReturn<ISession>> {
        return this.paginationService.cursor<
            ISession,
            Prisma.SessionWhereInput
        >(this.databaseService.client.session, {
            ...others,
            where: {
                ...where,
                userId,
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

    async findActive(userId: string): Promise<
        {
            id: string;
        }[]
    > {
        return this.databaseService.client.session.findMany({
            where: {
                userId,
                isRevoked: false,
                expiredAt: {
                    gte: this.helperDateService.create(),
                },
            },
            select: {
                id: true,
            },
        });
    }

    async findActiveByDeviceOwnership(
        userId: string,
        deviceOwnershipId: string
    ): Promise<
        {
            id: string;
        }[]
    > {
        return this.databaseService.client.session.findMany({
            where: {
                userId,
                isRevoked: false,
                expiredAt: {
                    gte: this.helperDateService.create(),
                },
                deviceOwnershipId,
            },
            select: {
                id: true,
            },
        });
    }

    async findOneActive(
        userId: string,
        sessionId: string
    ): Promise<Session | null> {
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
        return tx.session.create({
            data: {
                id: sessionId,
                userId,
                jti,
                expiredAt,
                isRevoked: false,
                ipAddress,
                deviceOwnershipId,
                userAgent: this.databaseUtil.toPlainObject(userAgent),
                geoLocation: this.databaseUtil.toPlainObject(geoLocation),
                createdBy: userId,
            },
        });
    }

    async updateJtiInTx(
        tx: IDatabaseTransactionClient,
        sessionId: string,
        jti: string
    ): Promise<Session> {
        return tx.session.update({
            where: { id: sessionId },
            data: { jti },
        });
    }

    async revokeInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        sessionId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<Session> {
        return tx.session.update({
            where: {
                id: sessionId,
                userId,
            },
            data: {
                isRevoked: true,
                revokedAt,
                revokedById: revokedBy,
                updatedBy: userId,
            },
        });
    }

    async revokeByAdminInTx(
        tx: IDatabaseTransactionClient,
        sessionId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<ISession> {
        return tx.session.update({
            where: {
                id: sessionId,
            },
            data: {
                isRevoked: true,
                revokedAt,
                revokedById: revokedBy,
                updatedBy: revokedBy,
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

    async revokeActiveByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<{ id: string }[]> {
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
                updatedBy: userId,
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
    ): Promise<{ id: string }[]> {
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
