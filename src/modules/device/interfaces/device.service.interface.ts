import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { DeviceRefreshRequestDto } from '@modules/device/dtos/requests/device.refresh.dto';
import { DeviceRequestDto } from '@modules/device/dtos/requests/device.request.dto';
import { DeviceOwnershipResponseDto } from '@modules/device/dtos/response/device.ownership.response';
import { DeviceResponseDto } from '@modules/device/dtos/response/device.response.dto';

export interface IDeviceService {
    getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.DeviceOwnershipSelect,
            Prisma.DeviceOwnershipWhereInput
        >
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
        { name, notificationToken, platform }: DeviceRefreshRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>>;
    remove(
        userId: string,
        deviceId: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>>;
    removeByAdmin(
        userId: string,
        deviceId: string,
        requestLog: IRequestLog,
        removedBy: string
    ): Promise<IResponseReturn<void>>;
}
