import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
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
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import { IDeviceService } from '@modules/device/interfaces/device.service.interface';
import { DeviceOwnershipRepository } from '@modules/device/repositories/device.ownership.repository';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { SessionUtil } from '@modules/session/utils/session.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { ActivityLogMetadataStoreKey } from '@modules/activity-log/constants/activity-log.constant';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceService implements IDeviceService {
    constructor(
        private readonly deviceOwnershipRepository: DeviceOwnershipRepository,
        private readonly sessionRepository: SessionRepository,
        private readonly sessionUtil: SessionUtil,
        private readonly deviceUtil: DeviceUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.DeviceOwnershipSelect,
            Prisma.DeviceOwnershipWhereInput
        >,
        isRevoked?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<DeviceOwnershipResponseDto>> {
        const { data, ...others } =
            await this.deviceOwnershipRepository.findWithPaginationOffsetByAdmin(
                userId,
                pagination,
                isRevoked
            );

        const deviceOwnerships: DeviceOwnershipResponseDto[] =
            this.deviceUtil.mapList(data);
        return {
            data: deviceOwnerships,
            ...others,
        };
    }

    async getListCursor(
        userId: string,
        sessionId: string,
        pagination: IPaginationQueryCursorParams<
            Prisma.DeviceOwnershipSelect,
            Prisma.DeviceOwnershipWhereInput
        >
    ): Promise<IResponsePagingReturn<DeviceOwnershipResponseDto>> {
        const { data, ...others } =
            await this.deviceOwnershipRepository.findActiveWithPaginationCursor(
                userId,
                sessionId,
                pagination
            );

        const deviceOwnerships: DeviceOwnershipResponseDto[] =
            this.deviceUtil.mapList(data);

        return {
            data: deviceOwnerships,
            ...others,
        };
    }

    async refresh(
        userId: string,
        deviceOwnershipId: string,
        { name, notificationToken, platform }: DeviceRefreshRequestDto
    ): Promise<void> {
        const existDeviceOwnership =
            await this.deviceOwnershipRepository.existActive(
                userId,
                deviceOwnershipId
            );
        if (!existDeviceOwnership) {
            throw new DeviceNotFoundException();
        }

        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        try {
            await this.deviceOwnershipRepository.refresh(
                userId,
                existDeviceOwnership.id,
                {
                    name,
                    notificationToken,
                    platform,
                },
                requestLog
            );

            return;
        } catch (err: unknown) {
            throw new AppUnknownException(err);
        }
    }

    async remove(userId: string, deviceOwnershipId: string): Promise<void> {
        const existDeviceOwnership =
            await this.deviceOwnershipRepository.existActive(
                userId,
                deviceOwnershipId
            );
        if (!existDeviceOwnership) {
            throw new DeviceNotFoundException();
        }

        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        try {
            const sessions =
                await this.sessionRepository.findActiveByDeviceOwnership(
                    userId,
                    existDeviceOwnership.id
                );

            await Promise.all([
                this.deviceOwnershipRepository.remove(
                    userId,
                    existDeviceOwnership.id,
                    requestLog,
                    userId
                ),
                this.sessionUtil.deleteAllLogins(userId, sessions),
            ]);

            return;
        } catch (err: unknown) {
            throw new AppUnknownException(err);
        }
    }

    async removeByAdmin(
        userId: string,
        deviceOwnershipId: string,
        removedBy: string
    ): Promise<IResponseReturn<void>> {
        const existDeviceOwnership =
            await this.deviceOwnershipRepository.existActive(
                userId,
                deviceOwnershipId
            );
        if (!existDeviceOwnership) {
            throw new DeviceNotFoundException();
        }

        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        try {
            const sessions =
                await this.sessionRepository.findActiveByDeviceOwnership(
                    userId,
                    existDeviceOwnership.id
                );

            const [removed] = await Promise.all([
                this.deviceOwnershipRepository.remove(
                    userId,
                    existDeviceOwnership.id,
                    requestLog,
                    removedBy
                ),
                this.sessionUtil.deleteAllLogins(userId, sessions),
            ]);

            this.requestStoreService.merge<IActivityLogMetadata>(
                ActivityLogMetadataStoreKey,
                this.deviceUtil.mapActivityLogMetadata(removed)
            );

            return {};
        } catch (err: unknown) {
            throw new AppUnknownException(err);
        }
    }
}
