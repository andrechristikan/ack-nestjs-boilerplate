import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type {
    ISession,
    ISessionList,
    ISessionLogin,
    ISessionRef,
    ISessionUserRef,
} from '@modules/session/interfaces/session.interface';
import type { Session } from '@generated/prisma-client/client';

export interface ISessionRepository {
    findWithPaginationOffsetByAdmin(
        userId: string,
        { where, ...others }: IPaginationQueryOffsetParams,
        isRevoked: Record<string, IPaginationEqual> | null
    ): Promise<IResponsePaginationReturn<ISessionList>>;
    findActiveWithPaginationCursor(
        userId: string,
        { where, ...others }: IPaginationQueryCursorParams,
        idleSince: Date
    ): Promise<IResponsePaginationReturn<ISessionList>>;
    findLoginById(
        userId: string,
        sessionId: string,
        idleSince: Date
    ): Promise<ISessionLogin | null>;
    createInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        sessionId: string,
        deviceOwnershipId: string,
        jtiDigest: string,
        expiredAt: Date,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<Session>;
    updateJtiInTx(
        tx: IDatabaseTransactionClient,
        sessionId: string,
        oldJtiDigest: string,
        newJtiDigest: string,
        idleSince: Date
    ): Promise<boolean>;
    revokeInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        sessionId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<boolean>;
    revokeLiveInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        sessionId: string,
        revokedBy: string,
        revokedAt: Date,
        idleSince: Date
    ): Promise<boolean>;
    revokeByAdminInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        sessionId: string,
        revokedBy: string,
        revokedAt: Date
    ): Promise<ISession | null>;
    revokeActiveByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        exceptSessionId: string | null,
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
    revokeByDeviceOwnershipIdsInTx(
        tx: IDatabaseTransactionClient,
        deviceOwnershipIds: string[],
        revokedBy: string,
        revokedAt: Date
    ): Promise<ISessionUserRef[]>;
    deleteExpiredBefore(threshold: Date): Promise<number>;
}
