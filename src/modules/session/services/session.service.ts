import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { SessionResponseDto } from '@modules/session/dtos/response/session.response.dto';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';
import { ISessionService } from '@modules/session/interfaces/session.service.interface';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { SessionUtil } from '@modules/session/utils/session.util';
import { Injectable, NotFoundException } from '@nestjs/common';

/**
 * Session Management Service
 *
 * Provides session operations including retrieving active sessions with pagination,
 * revoking user sessions, and revoking sessions via admin action.
 * Manages both cache and database persistence for session data.
 */
@Injectable()
export class SessionService implements ISessionService {
    constructor(
        private readonly sessionRepository: SessionRepository,
        private readonly sessionUtil: SessionUtil
    ) {}

    /**
     * Retrieves a paginated list of active sessions for a user using offset-based pagination.
     *
     * @param userId - The unique identifier of the user
     * @param pagination - Offset pagination parameters (limit, offset, orderBy, where)
     * @returns Paginated session data with pagination metadata (count, page, totalPage, hasNext, hasPrevious)
     */
    async getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.SessionSelect,
            Prisma.SessionWhereInput
        >
    ): Promise<IResponsePagingReturn<SessionResponseDto>> {
        const { data, ...others } =
            await this.sessionRepository.findActiveWithPaginationOffsetByAdmin(
                userId,
                pagination
            );

        const sessions: SessionResponseDto[] = this.sessionUtil.mapList(data);
        return {
            data: sessions,
            ...others,
        };
    }

    /**
     * Retrieves a paginated list of active sessions for a user using cursor-based pagination.
     *
     * @param userId - The unique identifier of the user
     * @param pagination - Cursor pagination parameters (cursor, first/last, orderBy, where)
     * @returns Paginated session data with pagination metadata and cursor for next page
     */
    async getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams<
            Prisma.SessionSelect,
            Prisma.SessionWhereInput
        >
    ): Promise<IResponsePagingReturn<SessionResponseDto>> {
        const { data, ...others } =
            await this.sessionRepository.findActiveWithPaginationCursor(
                userId,
                pagination
            );

        const sessions: SessionResponseDto[] = this.sessionUtil.mapList(data);

        return {
            data: sessions,
            ...others,
        };
    }

    /**
     * Revokes a specific user session from both database and cache.
     *
     * @param userId - The unique identifier of the user
     * @param sessionId - The unique identifier of the session to revoke
     * @param requestLog - Request log information for audit trail
     * @returns Empty response indicating successful revocation
     * @throws {NotFoundException} If session does not exist or is not active
     */
    async revoke(
        userId: string,
        sessionId: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        const checkActive = await this.sessionRepository.findOneActive(
            userId,
            sessionId
        );
        if (!checkActive) {
            throw new NotFoundException({
                statusCode: EnumSessionStatusCodeError.notFound,
                message: 'session.error.notFound',
            });
        }

        await Promise.all([
            this.sessionRepository.revoke(userId, sessionId, requestLog),
            this.sessionUtil.deleteOneLogin(userId, sessionId),
        ]);

        return;
    }

    /**
     * Revokes a user session via admin action with audit tracking.
     *
     * @param userId - The unique identifier of the user
     * @param sessionId - The unique identifier of the session to revoke
     * @param requestLog - Request log information for audit trail
     * @param revokedBy - The identifier of admin/user who initiated the revocation
     * @returns Response with activity log metadata for audit trail
     * @throws {NotFoundException} If session does not exist or is not active
     */
    async revokeByAdmin(
        userId: string,
        sessionId: string,
        requestLog: IRequestLog,
        revokedBy: string
    ): Promise<IResponseReturn<void>> {
        const checkActive = await this.sessionRepository.findOneActive(
            userId,
            sessionId
        );
        if (!checkActive) {
            throw new NotFoundException({
                statusCode: EnumSessionStatusCodeError.notFound,
                message: 'session.error.notFound',
            });
        }

        const [removed] = await Promise.all([
            this.sessionRepository.revokeByAdmin(
                sessionId,
                requestLog,
                revokedBy
            ),
            this.sessionUtil.deleteOneLogin(userId, sessionId),
        ]);

        return {
            metadataActivityLog:
                this.sessionUtil.mapActivityLogMetadata(removed),
        };
    }
}
