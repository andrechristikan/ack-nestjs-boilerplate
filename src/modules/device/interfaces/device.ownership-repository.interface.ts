import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { Prisma } from '@generated/prisma-client/client';
import type {
    IDeviceOwnership,
    IDeviceOwnershipLoginUpsert,
    IDeviceOwnershipWithDevice,
    IDeviceOwnershipWithSession,
} from '@modules/device/interfaces/device.interface';

export interface IDeviceOwnershipRepository {
    upsertForLoginInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceId: string,
        now: Date
    ): Promise<IDeviceOwnershipLoginUpsert>;
    findLiveDeviceIdInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceOwnershipId: string
    ): Promise<string | null>;
    removeOwnershipInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceOwnershipId: string,
        removedBy: string,
        now: Date
    ): Promise<IDeviceOwnership>;
    revokeAllByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        revokedBy: string,
        now: Date
    ): Promise<string[]>;
    findWithPaginationOffsetByAdmin(
        userId: string,
        {
            where,
            ...others
        }: IPaginationQueryOffsetParams<Prisma.DeviceOwnershipWhereInput>,
        isRevoked?: Record<string, IPaginationEqual>
    ): Promise<IResponsePaginationReturn<IDeviceOwnership>>;
    findActiveWithPaginationCursor(
        userId: string,
        sessionId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.DeviceOwnershipWhereInput>
    ): Promise<IResponsePaginationReturn<IDeviceOwnershipWithSession>>;
    findTokensByUserId(userId: string): Promise<IDeviceOwnershipWithDevice[]>;
    existsActive(userId: string, deviceOwnershipId: string): Promise<boolean>;
    touchInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceOwnershipId: string,
        now: Date
    ): Promise<string>;
    findDeviceIdsByUserAndTokens(
        userId: string,
        tokens: string[]
    ): Promise<string[]>;
}
