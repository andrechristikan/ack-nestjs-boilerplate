import { Prisma } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import {
    DeviceCursorAvailableOrderBy,
    DeviceDefaultAvailableOrderBy,
} from '@modules/device/constants/device.list.constant';
import type { DeviceAdminListRequestDto } from '@modules/device/dtos/request/device.admin-list.request.dto';
import type { DeviceSharedListRequestDto } from '@modules/device/dtos/request/device.shared-list.request.dto';
import type { DeviceRefreshRequestDto } from '@modules/device/dtos/request/device.refresh.request.dto';
import type { IDeviceOwnershipDetail } from '@modules/device/interfaces/device.interface';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceHttpService {
    constructor(
        private readonly deviceDomain: DeviceDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async getListOffsetByAdmin(
        userId: string,
        query: DeviceAdminListRequestDto
    ): Promise<IResponsePaginationReturn<IDeviceOwnershipDetail>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.DeviceOwnershipWhereInput>(
                query,
                {
                    availableOrderBy: DeviceDefaultAvailableOrderBy,
                }
            );
        const isRevoked = this.paginationQueryUtil.equalBoolean(
            Prisma.DeviceOwnershipScalarFieldEnum.isRevoked,
            query.isRevoked
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(isRevoked?.storeFilter ?? {}),
            },
        });

        const { data, ...others } =
            await this.deviceDomain.getListOffsetByAdmin(
                userId,
                params,
                isRevoked?.where
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
        query: DeviceSharedListRequestDto
    ): Promise<IResponsePaginationReturn<IDeviceOwnershipDetail>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.DeviceOwnershipWhereInput>(
                query,
                {
                    availableOrderBy: DeviceCursorAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } = await this.deviceDomain.getListCursor(
            userId,
            sessionId,
            params
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
