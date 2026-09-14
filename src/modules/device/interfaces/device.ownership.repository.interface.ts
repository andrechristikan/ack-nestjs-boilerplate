import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumDeviceNotificationProvider,
    Prisma,
} from '@generated/prisma-client';
import {
    IDeviceIdentity,
    IDeviceLoginUpsert,
    IDeviceOwnership,
    IDeviceOwnershipWithDevice,
    IDeviceOwnershipWithSession,
    IDeviceRefresh,
} from '@modules/device/interfaces/device.interface';

export interface IDeviceOwnershipRepository {
    upsertForLoginInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        { fingerprint, name, notificationToken, platform }: IDeviceIdentity,
        notificationProvider: EnumDeviceNotificationProvider | null,
        now: Date
    ): Promise<IDeviceLoginUpsert>;
    clearNotificationInTx(
        tx: IDatabaseTransactionClient,
        deviceOwnershipId: string,
        userId: string,
        now: Date
    ): Promise<void>;
    removeOwnershipInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceOwnershipId: string,
        removedBy: string,
        now: Date
    ): Promise<IDeviceOwnership>;
    findWithPaginationOffsetByAdmin(
        userId: string,
        {
            where,
            ...others
        }: IPaginationQueryOffsetParams<Prisma.DeviceOwnershipWhereInput>,
        isRevoked?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<IDeviceOwnership>>;
    findActiveWithPaginationCursor(
        userId: string,
        sessionId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.DeviceOwnershipWhereInput>
    ): Promise<IResponsePagingReturn<IDeviceOwnershipWithSession>>;
    findTokensByUserId(userId: string): Promise<IDeviceOwnershipWithDevice[]>;
    existsActive(userId: string, deviceOwnershipId: string): Promise<boolean>;
    refreshInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceOwnershipId: string,
        { name, notificationToken, platform }: IDeviceRefresh,
        notificationProvider: EnumDeviceNotificationProvider | null,
        now: Date
    ): Promise<void>;
    cleanupTokens(
        userId: string,
        tokens: string[]
    ): Promise<Prisma.BatchPayload>;
    cleanupStaleTokens(thresholdInMs: number): Promise<Prisma.BatchPayload>;
}
