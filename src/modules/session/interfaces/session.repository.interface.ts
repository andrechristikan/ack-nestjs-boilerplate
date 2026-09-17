import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import type {
    ISession,
    ISessionRef,
} from '@modules/session/interfaces/session.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Session } from '@generated/prisma-client/client';

export interface ISessionRepository {
    findWithPaginationOffsetByAdmin(
        userId: string,
        {
            where,
            ...others
        }: IPaginationQueryOffsetParams<Prisma.SessionWhereInput>,
        isRevoked?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<ISession>>;
    findActiveWithPaginationCursor(
        userId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.SessionWhereInput>
    ): Promise<IResponsePagingReturn<ISession>>;
    findActive(userId: string): Promise<ISessionRef[]>;
    findOneActive(userId: string, sessionId: string): Promise<Session | null>;
    createInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        sessionId: string,
        deviceOwnershipId: string,
        jti: string,
        expiredAt: Date,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<Session>;
    updateJtiInTx(
        tx: IDatabaseTransactionClient,
        sessionId: string,
        jti: string
    ): Promise<Session>;
    revokeInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        sessionId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<Session>;
    revoke(
        userId: string,
        sessionId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<Session>;
    revokeByAdmin(
        sessionId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<ISession>;
    revokeActiveByUser(
        userId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<ISessionRef[]>;
    revokeActiveByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<ISessionRef[]>;
    revokeByDeviceOwnershipInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceOwnershipId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<ISessionRef[]>;
}
