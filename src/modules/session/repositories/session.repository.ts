import { DatabaseService } from '@common/database/services/database.service';
import { HelperService } from '@common/helper/services/helper.service';
import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ISession } from '@modules/session/interfaces/session.interface';
import { Injectable } from '@nestjs/common';
import { EnumActivityLogAction, Prisma, Session } from '@prisma/client';

@Injectable()
export class SessionRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly helperService: HelperService,
        private readonly paginationService: PaginationService
    ) {}

    async findWithPaginationOffsetByAdmin(
        userId: string,
        {
            where,
            ...others
        }: IPaginationQueryOffsetParams<
            Prisma.SessionSelect,
            Prisma.SessionWhereInput
        >
    ): Promise<IResponsePagingReturn<ISession>> {
        return this.paginationService.offset<
            ISession,
            Prisma.SessionSelect,
            Prisma.SessionWhereInput
        >(this.databaseService.session, {
            ...others,
            where: {
                ...where,
                userId,
            },
            include: {
                user: true,
            },
        });
    }

    async findWithPaginationCursor(
        userId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<
            Prisma.SessionSelect,
            Prisma.SessionWhereInput
        >
    ): Promise<IResponsePagingReturn<ISession>> {
        return this.paginationService.cursor<
            ISession,
            Prisma.SessionSelect,
            Prisma.SessionWhereInput
        >(this.databaseService.session, {
            ...others,
            where: {
                ...where,
                userId,
            },
            include: {
                user: true,
            },
        });
    }

    async findActive(userId: string): Promise<
        {
            id: string;
        }[]
    > {
        return this.databaseService.session.findMany({
            where: {
                userId,
                isRevoked: false,
                expiredAt: {
                    gte: this.helperService.dateCreate(),
                },
            },
            select: {
                id: true,
            },
        });
    }

    async findActiveByDevice(
        userId: string,
        deviceId: string
    ): Promise<
        {
            id: string;
        }[]
    > {
        return this.databaseService.session.findMany({
            where: {
                userId,
                isRevoked: false,
                expiredAt: {
                    gte: this.helperService.dateCreate(),
                },
                deviceId,
            },
            select: {
                id: true,
            },
        });
    }

    async findOneActive(userId: string, sessionId: string): Promise<Session> {
        const today = this.helperService.dateCreate();

        return this.databaseService.session.findFirst({
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

    async revoke(
        userId: string,
        sessionId: string,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<Session> {
        return this.databaseService.session.update({
            where: {
                id: sessionId,
                userId,
            },
            data: {
                isRevoked: true,
                revokedAt: this.helperService.dateCreate(),
                updatedBy: userId,
                user: {
                    update: {
                        activityLogs: {
                            create: {
                                action: EnumActivityLogAction.userRevokeSession,
                                ipAddress,
                                userAgent,
                                geoLocation,
                                createdBy: userId,
                            },
                        },
                    },
                },
            },
        });
    }

    async revokeByAdmin(
        sessionId: string,
        { ipAddress, userAgent, geoLocation }: IRequestLog,
        revokedBy: string
    ): Promise<ISession> {
        return this.databaseService.session.update({
            where: {
                id: sessionId,
            },
            data: {
                isRevoked: true,
                revokedAt: this.helperService.dateCreate(),
                updatedBy: revokedBy,
                user: {
                    update: {
                        activityLogs: {
                            create: {
                                action: EnumActivityLogAction.userRevokeSessionByAdmin,
                                ipAddress,
                                userAgent,
                                geoLocation,
                                createdBy: revokedBy,
                            },
                        },
                    },
                },
            },
            include: {
                user: true,
            },
        });
    }
}
