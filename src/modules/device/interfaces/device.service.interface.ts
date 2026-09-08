import {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import {
    IDeviceOwnership,
    IDeviceOwnershipWithDevice,
    IDeviceOwnershipWithSession,
    IDeviceRefresh,
} from '@modules/device/interfaces/device.interface';

export interface IDeviceService {
    getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.DeviceOwnershipWhereInput>,
        isRevoked?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<IDeviceOwnership>>;
    getListCursor(
        userId: string,
        sessionId: string,
        pagination: IPaginationQueryCursorParams<Prisma.DeviceOwnershipWhereInput>
    ): Promise<IResponsePagingReturn<IDeviceOwnershipWithSession>>;
    getOwnershipsWithNotificationToken(
        userId: string
    ): Promise<IDeviceOwnershipWithDevice[]>;
    cleanupNotificationTokens(
        userId: string,
        tokens: string[]
    ): Promise<number>;
    cleanupStaleNotificationTokens(thresholdInMs: number): Promise<number>;
    refresh(
        userId: string,
        deviceOwnershipId: string,
        data: IDeviceRefresh
    ): Promise<void>;
    remove(userId: string, deviceOwnershipId: string): Promise<void>;
    removeByAdmin(
        userId: string,
        deviceOwnershipId: string,
        removedBy: string
    ): Promise<void>;
}
