import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { DeviceService } from '@modules/device/services/device.service';
import { SessionService } from '@modules/session/services/session.service';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class DeviceRemoveUseCase implements IAppUseCase<
    [string, string],
    IResponseReturn<void>
> {
    constructor(
        private readonly sessionService: SessionService,
        private readonly activityLogService: ActivityLogService,
        private readonly sessionQueue: SessionQueue,
        private readonly deviceService: DeviceService
    ) {}

    async execute(
        userId: string,
        deviceOwnershipId: string
    ): Promise<IResponseReturn<void>> {
        const { deviceOwnership, revokedSessions } =
            await this.sessionService.removeDeviceOwnership(
                userId,
                deviceOwnershipId,
                userId
            );

        const metadata = this.deviceService.mapActivityLogMetadata(
            deviceOwnership,
            revokedSessions.length
        );
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userRemoveDevice,
                userId,
                createdBy: userId,
                metadata,
            }),
        ];

        await this.sessionQueue.purgeLogins(userId, revokedSessions);

        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
