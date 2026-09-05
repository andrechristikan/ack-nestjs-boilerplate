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
import { IDeviceHttpService } from '@modules/device/interfaces/device.http.service.interface';
import { DeviceService } from '@modules/device/services/device.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceHttpService implements IDeviceHttpService {
    constructor(private readonly deviceService: DeviceService) {}

    async getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.DeviceOwnershipWhereInput>,
        isRevoked?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<IDeviceOwnershipDetail>> {
        const { data, ...others } =
            await this.deviceService.getListOffsetByAdmin(
                userId,
                pagination,
                isRevoked
            );
        const deviceOwnerships: IDeviceOwnershipDetail[] = data.map(
            deviceOwnership => ({
                ...deviceOwnership,
                activeSessionCount: deviceOwnership._count.sessions,
                isCurrentDevice: false,
            })
        );

        return {
            data: deviceOwnerships,
            ...others,
        };
    }

    async getListCursor(
        userId: string,
        sessionId: string,
        pagination: IPaginationQueryCursorParams<Prisma.DeviceOwnershipWhereInput>
    ): Promise<IResponsePagingReturn<IDeviceOwnershipDetail>> {
        const { data, ...others } = await this.deviceService.getListCursor(
            userId,
            sessionId,
            pagination
        );
        const deviceOwnerships: IDeviceOwnershipDetail[] = data.map(
            deviceOwnership => ({
                ...deviceOwnership,
                activeSessionCount: deviceOwnership._count.sessions,
                isCurrentDevice: deviceOwnership.sessions.length > 0,
            })
        );

        return {
            data: deviceOwnerships,
            ...others,
        };
    }

    async refresh(
        userId: string,
        deviceOwnershipId: string,
        body: DeviceRefreshRequestDto
    ): Promise<void> {
        await this.deviceService.refresh(userId, deviceOwnershipId, body);

        return;
    }

    async remove(userId: string, deviceOwnershipId: string): Promise<void> {
        await this.deviceService.remove(userId, deviceOwnershipId);

        return;
    }

    async removeByAdmin(
        userId: string,
        deviceOwnershipId: string,
        removedBy: string
    ): Promise<IResponseReturn<void>> {
        await this.deviceService.removeByAdmin(
            userId,
            deviceOwnershipId,
            removedBy
        );

        return {};
    }
}
