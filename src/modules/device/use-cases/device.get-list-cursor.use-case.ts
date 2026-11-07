import { Prisma } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { DeviceSharedListRequestDto } from '@modules/device/dtos/request/device.shared-list.request.dto';
import type { IDeviceOwnershipDetail } from '@modules/device/interfaces/device.interface';
import { DeviceService } from '@modules/device/services/device.service';
import { Injectable } from '@nestjs/common';
import {
    DeviceCursorAvailableOrderBy,
    DeviceSharedListCursorScope,
} from '@modules/device/constants/device.list.constant';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class DeviceGetListCursorUseCase implements IAppUseCase<
    [string, string, DeviceSharedListRequestDto],
    IResponsePaginationReturn<IDeviceOwnershipDetail>
> {
    constructor(
        private readonly deviceService: DeviceService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        userId: string,
        sessionId: string,
        query: DeviceSharedListRequestDto
    ): Promise<IResponsePaginationReturn<IDeviceOwnershipDetail>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.DeviceOwnershipWhereInput>(
                query,
                {
                    scope: DeviceSharedListCursorScope,
                    availableOrderBy: DeviceCursorAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } = await this.deviceService.getListCursor(
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
}
