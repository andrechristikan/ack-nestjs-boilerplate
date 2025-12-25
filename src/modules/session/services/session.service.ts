import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { SessionResponseDto } from '@modules/session/dtos/response/session.response.dto';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';
import { ISessionService } from '@modules/session/interfaces/session.service.interface';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { SessionUtil } from '@modules/session/utils/session.util';
import { Injectable, NotFoundException } from '@nestjs/common';

/**
 * Session Management Service
 *
 * Provides session management operations including retrieving active sessions with pagination,
 * revoking user sessions, and revoking sessions via admin. Manages both cache and database
 * persistence for session data.
 *
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
     * Queries the database for sessions belonging to the specified user with offset pagination,
     * then transforms the results into response DTOs.
     *
     * @param userId - The unique identifier of the user
     * @param pagination - Offset-based pagination parameters (limit, offset)
     * @returns Promise resolving to paginated session data with pagination metadata
     *
     */
    async getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<SessionResponseDto>> {
        const { data, ...others } =
            await this.sessionRepository.findWithPaginationOffsetByAdmin(
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
     * Queries the database for sessions belonging to the specified user with cursor pagination,
     * then transforms the results into response DTOs. Cursor-based pagination is more efficient
     * for large datasets and prevents issues with offset-based pagination.
     *
     * @param userId - The unique identifier of the user
     * @param pagination - Cursor-based pagination parameters (first/last, cursor, etc.)
     * @returns Promise resolving to paginated session data with pagination metadata
     *
     */
    async getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePagingReturn<SessionResponseDto>> {
        const { data, ...others } =
            await this.sessionRepository.findWithPaginationCursor(
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
     * Revokes a specific user session.
     *
     * Validates that the session exists and is active for the user, then revokes the session
     * in both the database and cache simultaneously. Removes the session from the user's active sessions.
     *
     * @param userId - The unique identifier of the user
     * @param sessionId - The unique identifier of the session to revoke
     * @param requestLog - Request log information for audit trail
     * @returns Promise resolving to an empty response indicating successful revocation
     *
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
     * Revokes a user session via admin action.
     *
     * Similar to revoke() but records the admin/revoker information for audit purposes.
     * Validates that the session exists and is active, then revokes it from both database
     * and cache while tracking who initiated the revocation.
     *
     * @param userId - The unique identifier of the user
     * @param sessionId - The unique identifier of the session to revoke
     * @param requestLog - Request log information for audit trail
     * @param revokeBy - The identifier (admin/user) who initiated the revocation
     * @returns Promise resolving to a response containing activity log metadata for audit trail
     *
     */
    async revokeByAdmin(
        userId: string,
        sessionId: string,
        requestLog: IRequestLog,
        revokeBy: string
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

        const [updated] = await Promise.all([
            this.sessionRepository.revokeByAdmin(
                sessionId,
                requestLog,
                revokeBy
            ),
            this.sessionUtil.deleteOneLogin(userId, sessionId),
        ]);

        return {
            metadataActivityLog:
                this.sessionUtil.mapActivityLogMetadata(updated),
        };
    }
}
