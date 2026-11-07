import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IDeviceRemoveResult } from '@modules/device/interfaces/device.interface';
import { DeviceService } from '@modules/device/services/device.service';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import { DeviceUtil } from '@modules/device/utils/device.util';
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
        private readonly deviceService: DeviceService,
        private readonly sessionService: SessionService,
        private readonly activityLogService: ActivityLogService,
        private readonly roleService: RoleService,
        private readonly sessionQueue: SessionQueue,
        private readonly deviceUtil: DeviceUtil,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    private async removeRevokedBy(
        userId: string,
        deviceOwnershipId: string,
        removedBy: string
    ): Promise<IDeviceRemoveResult> {
        const now = this.helperDateService.create();

        try {
            return await this.databaseService.withTransaction(async tx => {
                const revokedSessions =
                    await this.sessionService.revokeByDeviceOwnershipInTx(
                        tx,
                        userId,
                        deviceOwnershipId,
                        removedBy,
                        now
                    );
                const deviceOwnership =
                    await this.deviceService.removeOwnershipInTx(
                        tx,
                        userId,
                        deviceOwnershipId,
                        removedBy,
                        now
                    );

                return { deviceOwnership, revokedSessions };
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new DeviceNotFoundException();
            }

            throw new AppUnknownException(err);
        }
    }

    async execute(
        userId: string,
        deviceOwnershipId: string,
        user: IUser
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards
        const targetRole = await this.roleService.getOneByUserId(userId);
        this.roleService.assertActorOutranks(user.role.type, targetRole.type);

        const { deviceOwnership, revokedSessions } = await this.removeRevokedBy(
            userId,
            deviceOwnershipId,
            user.id
        );

        const actorMetadata = this.deviceUtil.mapActivityLogActorMetadata(
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
            const targetMetadata = this.deviceUtil.mapActivityLogTargetMetadata(
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
