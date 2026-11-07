import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { DeviceRefreshRequestDto } from '@modules/device/dtos/request/device.refresh.request.dto';
import { DeviceService } from '@modules/device/services/device.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class DeviceRefreshUseCase implements IAppUseCase<
    [string, string, DeviceRefreshRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly deviceService: DeviceService,
        private readonly activityLogService: ActivityLogService
    ) {}

    async execute(
        userId: string,
        deviceOwnershipId: string,
        body: DeviceRefreshRequestDto
    ): Promise<IResponseReturn<void>> {
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userDeviceRefresh,
            }),
        ];

        await this.deviceService.refresh(userId, deviceOwnershipId, body);

        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
