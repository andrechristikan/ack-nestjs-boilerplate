import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type {
    EnumDeviceNotificationProvider,
    Prisma,
} from '@generated/prisma-client/client';
import type {
    IDeviceOwnership,
    IDeviceOwnershipLoginUpsert,
    IDeviceOwnershipWithSession,
    IDeviceRefresh,
} from '@modules/device/interfaces/device.interface';

export interface IDeviceOwnershipRepository {
    upsertActiveInTx(
        tx: IDatabaseTransactionClient,
        deviceId: string,
        userId: string,
        notificationToken: string | null,
        notificationProvider: EnumDeviceNotificationProvider | null,
        now: Date
    ): Promise<IDeviceOwnershipLoginUpsert>;
    clearNotificationInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceOwnershipId: string,
        updatedBy: string,
        now: Date
    ): Promise<boolean>;
    removeOwnershipInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceOwnershipId: string,
        removedBy: string,
        now: Date,
        idleSince: Date,
        additionalWhere: Prisma.DeviceOwnershipWhereInput | null
    ): Promise<IDeviceOwnership | null>;
    revokeAllByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        revokedBy: string,
        now: Date
    ): Promise<void>;
    findWithPaginationOffsetByAdmin(
        userId: string,
        { where, ...others }: IPaginationQueryOffsetParams,
        isRevoked: Record<string, IPaginationEqual> | null,
        idleSince: Date,
        additionalWhere: Prisma.DeviceOwnershipWhereInput | null
    ): Promise<IResponsePaginationReturn<IDeviceOwnership>>;
    findActiveWithPaginationCursor(
        userId: string,
        sessionId: string,
        { where, ...others }: IPaginationQueryCursorParams,
        idleSince: Date
    ): Promise<IResponsePaginationReturn<IDeviceOwnershipWithSession>>;
    findTokensByUserId(
        userId: string,
        now: Date,
        idleSince: Date
    ): Promise<string[]>;
    refreshInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceOwnershipId: string,
        { notificationToken }: IDeviceRefresh,
        notificationProvider: EnumDeviceNotificationProvider | null,
        now: Date
    ): Promise<string | null>;
    touchInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceOwnershipId: string,
        now: Date
    ): Promise<string | null>;
    clearTokenFromOtherUsersInTx(
        tx: IDatabaseTransactionClient,
        notificationToken: string,
        userId: string
    ): Promise<void>;
    findOtherIdsByDeviceInTx(
        tx: IDatabaseTransactionClient,
        deviceId: string,
        userId: string
    ): Promise<string[]>;
    clearTokens(userId: string, tokens: string[]): Promise<Prisma.BatchPayload>;
    clearTokensWithoutLiveSession(
        userId: string,
        now: Date,
        idleSince: Date
    ): Promise<Prisma.BatchPayload>;
    clearStaleTokens(thresholdInMs: number): Promise<Prisma.BatchPayload>;
}
