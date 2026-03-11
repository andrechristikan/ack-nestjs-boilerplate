import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
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
import { DeviceOwnershipResponseDto } from '@modules/device/dtos/response/device.ownership.response';
import { DeviceResponseDto } from '@modules/device/dtos/response/device.response.dto';
import { EnumDeviceStatusCodeError } from '@modules/device/enums/device.status-code.enum';
import { IDeviceService } from '@modules/device/interfaces/device.service.interface';
import { DeviceOwnershipRepository } from '@modules/device/repositories/device.ownership.repository';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { SessionUtil } from '@modules/session/utils/session.util';
import {
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';

@Injectable()
export class DeviceService implements IDeviceService {
    constructor(
        private readonly deviceOwnershipRepository: DeviceOwnershipRepository,
        private readonly sessionRepository: SessionRepository,
        private readonly sessionUtil: SessionUtil,
        private readonly deviceUtil: DeviceUtil
    ) {}

    async getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.DeviceOwnershipSelect,
            Prisma.DeviceOwnershipWhereInput
        >
    ): Promise<IResponsePagingReturn<DeviceOwnershipResponseDto>> {
        const { data, ...others } =
            await this.deviceOwnershipRepository.findActiveWithPaginationOffsetByAdmin(
                userId,
                pagination
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
        { name, notificationToken, platform }: DeviceRefreshRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        const existDeviceOwnership =
            await this.deviceOwnershipRepository.existActive(
                userId,
                deviceOwnershipId
            );
        if (!existDeviceOwnership) {
            throw new NotFoundException({
                statusCode: EnumDeviceStatusCodeError.notFound,
                message: 'device.error.notFound',
            });
        }

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
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async remove(
        userId: string,
        deviceOwnershipId: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        const existDeviceOwnership =
            await this.deviceOwnershipRepository.existActive(
                userId,
                deviceOwnershipId
            );
        if (!existDeviceOwnership) {
            throw new NotFoundException({
                statusCode: EnumDeviceStatusCodeError.notFound,
                message: 'device.error.notFound',
            });
        }

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
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async removeByAdmin(
        userId: string,
        deviceOwnershipId: string,
        requestLog: IRequestLog,
        removedBy: string
    ): Promise<IResponseReturn<void>> {
        const existDeviceOwnership =
            await this.deviceOwnershipRepository.existActive(
                userId,
                deviceOwnershipId
            );
        if (!existDeviceOwnership) {
            throw new NotFoundException({
                statusCode: EnumDeviceStatusCodeError.notFound,
                message: 'device.error.notFound',
            });
        }

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

            return {
                metadataActivityLog:
                    this.deviceUtil.mapActivityLogMetadata(removed),
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }
}
