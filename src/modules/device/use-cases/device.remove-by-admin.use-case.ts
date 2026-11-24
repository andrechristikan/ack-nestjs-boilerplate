import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import { DeviceService } from '@modules/device/services/device.service';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { RoleService } from '@modules/role/services/role.service';
import { SessionService } from '@modules/session/services/session.service';
import { UserService } from '@modules/user/services/user.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@Injectable()
export class DeviceRemoveByAdminUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        string,
        string,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly sessionService: SessionService,
        private readonly deviceService: DeviceService,
        private readonly roleService: RoleService,
        private readonly userService: UserService,
        private readonly deviceUtil: DeviceUtil,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        userId: string,
        deviceOwnershipId: string
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: a write after its checks
        const target = await this.userService.getOneWithRole(userId);
        this.roleService.assertActorOutranks(
            userContext.user.role.type,
            target.role.type
        );
        this.userService.assertUnblocked(target);

        const removedBy = authContext.userId;
        const isOwnedByOther = this.deviceUtil.isOwnedByOther(
            userId,
            removedBy
        );
        const now = this.helperDateService.now();
        try {
            await this.databaseService.withTransaction(async tx => {
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

                const actorMetadata =
                    this.deviceUtil.mapActivityLogActorMetadata(
                        deviceOwnership,
                        revokedSessions.length
                    );
                const entries: IOutboxEffect[] = [
                    this.activityLogQueue.recordEffect(
                        requestContext,
                        apiKeyContext,
                        authContext,
                        null,
                        {
                            action: EnumActivityLogAction.adminDeviceRemoved,
                            metadata: actorMetadata,
                        }
                    ),
                ];

                if (isOwnedByOther) {
                    const targetMetadata =
                        this.deviceUtil.mapActivityLogTargetMetadata(
                            deviceOwnership,
                            removedBy,
                            revokedSessions.length
                        );
                    const targetEntry = this.activityLogQueue.recordEffect(
                        requestContext,
                        apiKeyContext,
                        authContext,
                        null,
                        {
                            action: EnumActivityLogAction.userDeviceRemovedByAdmin,
                            userId,
                            createdBy: removedBy,
                            metadata: targetMetadata,
                        }
                    );
                    entries.push(targetEntry);
                }
                await this.outboxService.addManyInTx(tx, entries);
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

        return {};
    }
}
