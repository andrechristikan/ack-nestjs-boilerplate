import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { ActivityLogMetadataStoreKey } from '@modules/activity-log/constants/activity-log.constant';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import {
    IDeviceOwnership,
    IDeviceOwnershipWithDevice,
    IDeviceOwnershipWithSession,
    IDeviceRefresh,
} from '@modules/device/interfaces/device.interface';
import { IDeviceService } from '@modules/device/interfaces/device.service.interface';
import { DeviceOwnershipRepository } from '@modules/device/repositories/device.ownership.repository';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { SessionService } from '@modules/session/services/session.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceService implements IDeviceService {
    constructor(
        private readonly deviceOwnershipRepository: DeviceOwnershipRepository,
        private readonly sessionService: SessionService,
        private readonly deviceUtil: DeviceUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.DeviceOwnershipWhereInput>,
        isRevoked?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<IDeviceOwnership>> {
        return this.deviceOwnershipRepository.findWithPaginationOffsetByAdmin(
            userId,
            pagination,
            isRevoked
        );
    }

    async getListCursor(
        userId: string,
        sessionId: string,
        pagination: IPaginationQueryCursorParams<Prisma.DeviceOwnershipWhereInput>
    ): Promise<IResponsePagingReturn<IDeviceOwnershipWithSession>> {
        return this.deviceOwnershipRepository.findActiveWithPaginationCursor(
            userId,
            sessionId,
            pagination
        );
    }

    async getOwnershipsWithNotificationToken(
        userId: string
    ): Promise<IDeviceOwnershipWithDevice[]> {
        return this.deviceOwnershipRepository.findTokensByUserId(userId);
    }

    async cleanupNotificationTokens(
        userId: string,
        tokens: string[]
    ): Promise<number> {
        const { count } = await this.deviceOwnershipRepository.cleanupTokens(
            userId,
            tokens
        );

        return count;
    }

    async cleanupStaleNotificationTokens(
        thresholdInMs: number
    ): Promise<number> {
        const { count } =
            await this.deviceOwnershipRepository.cleanupStaleTokens(
                thresholdInMs
            );

        return count;
    }

    async refresh(
        userId: string,
        deviceOwnershipId: string,
        data: IDeviceRefresh
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
        const notificationProvider =
            this.deviceUtil.resolveNotificationProvider(data.platform ?? null);

        try {
            await this.deviceOwnershipRepository.refresh(
                userId,
                existDeviceOwnership.id,
                data,
                notificationProvider,
                requestLog
            );

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

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
            await this.sessionService.deleteLoginsByDeviceOwnership(
                userId,
                existDeviceOwnership.id
            );
            await this.deviceOwnershipRepository.remove(
                userId,
                existDeviceOwnership.id,
                requestLog
            );

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async removeByAdmin(
        userId: string,
        deviceOwnershipId: string,
        removedBy: string
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
            await this.sessionService.deleteLoginsByDeviceOwnership(
                userId,
                existDeviceOwnership.id
            );
            const removed = await this.deviceOwnershipRepository.removeByAdmin(
                userId,
                existDeviceOwnership.id,
                removedBy,
                requestLog
            );

            this.requestStoreService.merge<IActivityLogMetadata>(
                ActivityLogMetadataStoreKey,
                this.deviceUtil.mapActivityLogMetadata(removed)
            );

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }
}
