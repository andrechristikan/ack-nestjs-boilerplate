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
import { DeviceDto } from '@modules/device/dtos/device.dto';
import { DeviceResponseDto } from '@modules/device/dtos/response/device.response.dto';

export interface IDeviceService {
    getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.DeviceSelect,
            Prisma.DeviceWhereInput
        >
    ): Promise<IResponsePagingReturn<DeviceResponseDto>>;
    getListCursor(
        userId: string,
        sessionId: string,
        pagination: IPaginationQueryCursorParams<
            Prisma.DeviceSelect,
            Prisma.DeviceWhereInput
        >
    ): Promise<IResponsePagingReturn<DeviceResponseDto>>;
    refresh(
        userId: string,
        { fingerprint, name, notificationToken, platform }: DeviceDto,
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
