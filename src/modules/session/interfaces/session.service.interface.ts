import {
    IPaginationEqual,
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

export interface ISessionService {
    getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.SessionSelect,
            Prisma.SessionWhereInput
        >,
        isRevoked?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<SessionResponseDto>>;
    getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams<
            Prisma.SessionSelect,
            Prisma.SessionWhereInput
        >
    ): Promise<IResponsePagingReturn<SessionResponseDto>>;
    revoke(
        userId: string,
        sessionId: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>>;
    revokeByAdmin(
        userId: string,
        sessionId: string,
        requestLog: IRequestLog,
        revokedBy: string
    ): Promise<IResponseReturn<void>>;
}
