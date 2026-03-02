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
import { DeviceDto } from '@modules/device/dtos/device.dto';
import { DeviceResponseDto } from '@modules/device/dtos/response/device.response.dto';
import { EnumDeviceStatusCodeError } from '@modules/device/enums/device.status-code.enum';
import { IDeviceService } from '@modules/device/interfaces/device.service.interface';
import { DeviceRepository } from '@modules/device/repositories/device.repository';
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
        private readonly deviceRepository: DeviceRepository,
        private readonly sessionRepository: SessionRepository,
        private readonly sessionUtil: SessionUtil,
        private readonly deviceUtil: DeviceUtil
    ) {}

    async getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.DeviceSelect,
            Prisma.DeviceWhereInput
        >
    ): Promise<IResponsePagingReturn<DeviceResponseDto>> {
        const { data, ...others } =
            await this.deviceRepository.findWithPaginationOffsetByAdmin(
                userId,
                pagination
            );

        const devices: DeviceResponseDto[] = this.deviceUtil.mapList(data);
        return {
            data: devices,
            ...others,
        };
    }

    async getListCursor(
        userId: string,
        sessionId: string,
        pagination: IPaginationQueryCursorParams<
            Prisma.DeviceSelect,
            Prisma.DeviceWhereInput
        >
    ): Promise<IResponsePagingReturn<DeviceResponseDto>> {
        const { data, ...others } =
            await this.deviceRepository.findWithPaginationCursor(
                userId,
                sessionId,
                pagination
            );

        const devices: DeviceResponseDto[] = this.deviceUtil.mapList(data);

        return {
            data: devices,
            ...others,
        };
    }

    async refresh(
        userId: string,
        { fingerprint, name, notificationToken, platform }: DeviceDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        const existDevice = await this.deviceRepository.existByFingerprint(
            userId,
            fingerprint
        );
        if (!existDevice) {
            throw new NotFoundException({
                statusCode: EnumDeviceStatusCodeError.notFound,
                message: 'device.error.notFound',
            });
        }

        try {
            await this.deviceRepository.refresh(
                userId,
                {
                    fingerprint,
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
        deviceId: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        const existDevice = await this.deviceRepository.exist(userId, deviceId);
        if (!existDevice) {
            throw new NotFoundException({
                statusCode: EnumDeviceStatusCodeError.notFound,
                message: 'device.error.notFound',
            });
        }

        try {
            const sessions = await this.sessionRepository.findActiveByDevice(
                userId,
                deviceId
            );

            await Promise.all([
                this.deviceRepository.remove(
                    userId,
                    deviceId,
                    requestLog,
                    userId
                ),
                this.sessionUtil.deleteAllLogins(userId, sessions),
                // TODO: LAST REVOKE
                // this.notificationPushTokenRepository.revokeBySessionId(
                //     sessionId,
                //     revokeBy
                // ),
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
        deviceId: string,
        requestLog: IRequestLog,
        removedBy: string
    ): Promise<IResponseReturn<void>> {
        const existDevice = await this.deviceRepository.exist(userId, deviceId);
        if (!existDevice) {
            throw new NotFoundException({
                statusCode: EnumDeviceStatusCodeError.notFound,
                message: 'device.error.notFound',
            });
        }

        try {
            const sessions = await this.sessionRepository.findActiveByDevice(
                userId,
                deviceId
            );

            const [removed] = await Promise.all([
                this.deviceRepository.remove(
                    userId,
                    deviceId,
                    requestLog,
                    removedBy
                ),
                this.sessionUtil.deleteAllLogins(userId, sessions),
                // TODO: LAST REVOKE
                // this.notificationPushTokenRepository.revokeBySessionId(
                //     sessionId,
                //     revokeBy
                // ),
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
