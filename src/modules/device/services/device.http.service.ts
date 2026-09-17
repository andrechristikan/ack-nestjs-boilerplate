import type {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { DeviceRefreshRequestDto } from '@modules/device/dtos/request/device.refresh.request.dto';
import type { IDeviceOwnershipDetail } from '@modules/device/interfaces/device.interface';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceHttpService {
    constructor(private readonly deviceDomain: DeviceDomain) {}

    async getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.DeviceOwnershipWhereInput>,
        isRevoked?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<IDeviceOwnershipDetail>> {
        const { data, ...others } =
            await this.deviceDomain.getListOffsetByAdmin(
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
        const { data, ...others } = await this.deviceDomain.getListCursor(
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
        await this.deviceDomain.refresh(userId, deviceOwnershipId, body);

        return;
    }

    async remove(userId: string, deviceOwnershipId: string): Promise<void> {
        await this.deviceDomain.remove(userId, deviceOwnershipId);

        return;
    }

    async removeByAdmin(
        userId: string,
        deviceOwnershipId: string,
        removedBy: string
    ): Promise<IResponseReturn<void>> {
        await this.deviceDomain.removeByAdmin(
            userId,
            deviceOwnershipId,
            removedBy
        );

        return {};
    }
}
