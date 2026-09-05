import {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { ISession } from '@modules/session/interfaces/session.interface';

export interface ISessionService {
    getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.SessionWhereInput>,
        isRevoked?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<ISession>>;
    getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.SessionWhereInput>
    ): Promise<IResponsePagingReturn<ISession>>;
    deleteAllLogins(userId: string): Promise<void>;
    deleteOneLogin(userId: string, sessionId: string): Promise<void>;
    deleteLoginsByDeviceOwnership(
        userId: string,
        deviceOwnershipId: string
    ): Promise<void>;
    revoke(userId: string, sessionId: string): Promise<void>;
    revokeByAdmin(
        userId: string,
        sessionId: string,
        revokedBy: string
    ): Promise<void>;
}
