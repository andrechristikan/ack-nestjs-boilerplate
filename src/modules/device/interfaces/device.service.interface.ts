import {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { DeviceRefreshRequestDto } from '@modules/device/dtos/requests/device.refresh.dto';
import { DeviceOwnershipResponseDto } from '@modules/device/dtos/response/device.ownership.response';

export interface IDeviceService {
    getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.DeviceOwnershipSelect,
            Prisma.DeviceOwnershipWhereInput
        >,
        isRevoked?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<DeviceOwnershipResponseDto>>;
    getListCursor(
        userId: string,
        sessionId: string,
        pagination: IPaginationQueryCursorParams<
            Prisma.DeviceOwnershipSelect,
            Prisma.DeviceOwnershipWhereInput
        >
    ): Promise<IResponsePagingReturn<DeviceOwnershipResponseDto>>;
    refresh(
        userId: string,
        deviceOwnershipId: string,
        { name, notificationToken, platform }: DeviceRefreshRequestDto
    ): Promise<void>;
    remove(
        userId: string,
        deviceOwnershipId: string
    ): Promise<void>;
    removeByAdmin(
        userId: string,
        deviceOwnershipId: string,
        removedBy: string
    ): Promise<IResponseReturn<void>>;
}
