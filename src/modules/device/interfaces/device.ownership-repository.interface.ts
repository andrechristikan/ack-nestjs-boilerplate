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
        now: Date
    ): Promise<IDeviceOwnership | null>;
    revokeAllByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        revokedBy: string,
        now: Date
    ): Promise<void>;
    findWithPaginationOffsetByAdmin(
        userId: string,
        {
            where,
            ...others
        }: IPaginationQueryOffsetParams<Prisma.DeviceOwnershipWhereInput>,
        isRevoked: Record<string, IPaginationEqual> | null
    ): Promise<IResponsePaginationReturn<IDeviceOwnership>>;
    findActiveWithPaginationCursor(
        userId: string,
        sessionId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.DeviceOwnershipWhereInput>
    ): Promise<IResponsePaginationReturn<IDeviceOwnershipWithSession>>;
    findTokensByUserId(userId: string): Promise<string[]>;
    refreshInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceOwnershipId: string,
        { notificationToken, platform }: IDeviceRefresh,
        notificationProvider: EnumDeviceNotificationProvider | null,
        now: Date
    ): Promise<string | null>;
    clearTokenFromOtherUsersInTx(
        tx: IDatabaseTransactionClient,
        notificationToken: string,
        userId: string
    ): Promise<void>;
    clearTokens(userId: string, tokens: string[]): Promise<Prisma.BatchPayload>;
    clearStaleTokens(thresholdInMs: number): Promise<Prisma.BatchPayload>;
}
