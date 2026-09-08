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
import { DeviceRefreshRequestDto } from '@modules/device/dtos/request/device.refresh.request.dto';
import { IDeviceOwnershipDetail } from '@modules/device/interfaces/device.interface';

export interface IDeviceHttpService {
    getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.DeviceOwnershipWhereInput>,
        isRevoked?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<IDeviceOwnershipDetail>>;
    getListCursor(
        userId: string,
        sessionId: string,
        pagination: IPaginationQueryCursorParams<Prisma.DeviceOwnershipWhereInput>
    ): Promise<IResponsePagingReturn<IDeviceOwnershipDetail>>;
    refresh(
        userId: string,
        deviceOwnershipId: string,
        body: DeviceRefreshRequestDto
    ): Promise<void>;
    remove(userId: string, deviceOwnershipId: string): Promise<void>;
    removeByAdmin(
        userId: string,
        deviceOwnershipId: string,
        removedBy: string
    ): Promise<IResponseReturn<void>>;
}
