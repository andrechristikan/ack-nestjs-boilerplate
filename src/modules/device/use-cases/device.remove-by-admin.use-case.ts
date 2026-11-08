import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { DeviceService } from '@modules/device/services/device.service';
import { RoleService } from '@modules/role/services/role.service';
import { SessionService } from '@modules/session/services/session.service';
import { SessionQueue } from '@modules/session/queues/session.queue';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class DeviceRemoveByAdminUseCase implements IAppUseCase<
    [string, string, IUser],
    IResponseReturn<void>
> {
    constructor(
        private readonly sessionService: SessionService,
        private readonly activityLogService: ActivityLogService,
        private readonly roleService: RoleService,
        private readonly sessionQueue: SessionQueue,
        private readonly deviceService: DeviceService
    ) {}

    async execute(
        userId: string,
        deviceOwnershipId: string,
        user: IUser
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards
        const targetRole = await this.roleService.getOneByUserId(userId);
        this.roleService.assertActorOutranks(user.role.type, targetRole.type);

        const { deviceOwnership, revokedSessions } =
            await this.sessionService.removeDeviceOwnership(
                userId,
                deviceOwnershipId,
                user.id
            );

        const actorMetadata = this.deviceService.mapActivityLogActorMetadata(
            deviceOwnership,
            revokedSessions.length
        );
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.adminDeviceRemove,
                metadata: actorMetadata,
            }),
        ];
        if (userId !== user.id) {
            const targetMetadata =
                this.deviceService.mapActivityLogTargetMetadata(
                    deviceOwnership,
                    user.id,
                    revokedSessions.length
                );
            const targetActivityLog = this.activityLogService.prepare({
                action: EnumActivityLogAction.userRemoveDeviceByAdmin,
                userId,
                createdBy: user.id,
                metadata: targetMetadata,
            });
            activityLogs.push(targetActivityLog);
        }

        await this.sessionQueue.purgeLogins(userId, revokedSessions);

        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
