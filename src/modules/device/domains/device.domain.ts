import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumDeviceNotificationProvider,
    Prisma,
} from '@generated/prisma-client';
import { ActivityLogMetadataStoreKey } from '@modules/activity-log/constants/activity-log.constant';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import {
    IDeviceIdentity,
    IDeviceLoginUpsert,
    IDeviceOwnership,
    IDeviceOwnershipWithDevice,
    IDeviceOwnershipWithSession,
    IDeviceRefresh,
} from '@modules/device/interfaces/device.interface';
import { DeviceOwnershipRepository } from '@modules/device/repositories/device.ownership.repository';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceDomain {
    constructor(
        private readonly deviceOwnershipRepository: DeviceOwnershipRepository,
        private readonly sessionDomain: SessionDomain,
        private readonly deviceUtil: DeviceUtil,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService,
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

    async upsertForLoginInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        device: IDeviceIdentity,
        notificationProvider: EnumDeviceNotificationProvider | null,
        now: Date
    ): Promise<IDeviceLoginUpsert> {
        return this.deviceOwnershipRepository.upsertForLoginInTx(
            tx,
            userId,
            device,
            notificationProvider,
            now
        );
    }

    async clearNotificationInTx(
        tx: IDatabaseTransactionClient,
        deviceOwnershipId: string,
        userId: string,
        now: Date
    ): Promise<void> {
        await this.deviceOwnershipRepository.clearNotificationInTx(
            tx,
            deviceOwnershipId,
            userId,
            now
        );
    }

    async refresh(
        userId: string,
        deviceOwnershipId: string,
        data: IDeviceRefresh
    ): Promise<void> {
        const deviceOwnershipExists =
            await this.deviceOwnershipRepository.existsActive(
                userId,
                deviceOwnershipId
            );
        if (!deviceOwnershipExists) {
            throw new DeviceNotFoundException();
        }

        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;
        const notificationProvider =
            this.deviceUtil.resolveNotificationProvider(data.platform ?? null);
        const now = this.helperDateService.create();

        try {
            await this.databaseService.client.$transaction(async tx => {
                await this.deviceOwnershipRepository.refreshInTx(
                    tx,
                    userId,
                    deviceOwnershipId,
                    data,
                    notificationProvider,
                    now
                );
                await this.activityLogDomain.recordInTx(
                    tx,
                    userId,
                    EnumActivityLogAction.userDeviceRefresh,
                    requestLog,
                    null
                );
            });

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async remove(userId: string, deviceOwnershipId: string): Promise<void> {
        const deviceOwnershipExists =
            await this.deviceOwnershipRepository.existsActive(
                userId,
                deviceOwnershipId
            );
        if (!deviceOwnershipExists) {
            throw new DeviceNotFoundException();
        }

        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;
        const now = this.helperDateService.create();

        try {
            await this.sessionDomain.deleteLoginsByDeviceOwnership(
                userId,
                deviceOwnershipId
            );
            await this.databaseService.client.$transaction(async tx => {
                await this.sessionDomain.revokeByDeviceOwnershipInTx(
                    tx,
                    userId,
                    deviceOwnershipId,
                    userId,
                    now
                );
                await this.deviceOwnershipRepository.removeOwnershipInTx(
                    tx,
                    userId,
                    deviceOwnershipId,
                    userId,
                    now
                );
                await this.activityLogDomain.recordInTx(
                    tx,
                    userId,
                    EnumActivityLogAction.userRemoveDevice,
                    requestLog,
                    null
                );
            });

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
        const deviceOwnershipExists =
            await this.deviceOwnershipRepository.existsActive(
                userId,
                deviceOwnershipId
            );
        if (!deviceOwnershipExists) {
            throw new DeviceNotFoundException();
        }

        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;
        const now = this.helperDateService.create();

        try {
            await this.sessionDomain.deleteLoginsByDeviceOwnership(
                userId,
                deviceOwnershipId
            );
            const removed = await this.databaseService.client.$transaction(
                async tx => {
                    await this.sessionDomain.revokeByDeviceOwnershipInTx(
                        tx,
                        userId,
                        deviceOwnershipId,
                        removedBy,
                        now
                    );
                    const row =
                        await this.deviceOwnershipRepository.removeOwnershipInTx(
                            tx,
                            userId,
                            deviceOwnershipId,
                            removedBy,
                            now
                        );
                    await this.activityLogDomain.recordInTx(
                        tx,
                        removedBy,
                        EnumActivityLogAction.userRemoveDevice,
                        requestLog,
                        null
                    );

                    return row;
                }
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
