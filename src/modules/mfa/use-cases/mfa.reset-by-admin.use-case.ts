import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { DeviceService } from '@modules/device/services/device.service';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { RoleService } from '@modules/role/services/role.service';
import { SessionService } from '@modules/session/services/session.service';
import { UserService } from '@modules/user/services/user.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@Injectable()
export class MfaResetByAdminUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        string,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly mfaService: MfaService,
        private readonly userService: UserService,
        private readonly roleService: RoleService,
        private readonly sessionService: SessionService,
        private readonly deviceService: DeviceService,
        private readonly notificationUtil: NotificationUtil,
        private readonly notificationQueue: NotificationQueue,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly userUtil: UserUtil,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        userId: string
    ): Promise<IResponseReturn<void>> {
        this.userService.assertNotSelf(userId, authContext.userId);

        const [target] = await Promise.all([
            this.userService.getOneWithRole(userId),
            this.mfaService.assertHasFactor(userId),
        ]);
        this.roleService.assertActorOutranks(
            userContext.user.role.type,
            target.role.type
        );
        this.userService.assertUnblocked(target);

        const tokens = await this.deviceService.getNotificationTokens(userId);
        const snapshot = this.notificationUtil.sealSnapshot(target, tokens);

        const now = this.helperDateService.create();
        await this.databaseService.withTransaction(async tx => {
            await Promise.all([
                this.mfaService.resetByAdminInTx(tx, userId),
                this.sessionService.revokeActiveByUserInTx(
                    tx,
                    userId,
                    authContext.userId,
                    now
                ),
            ]);
            const effect = this.notificationQueue.notify(
                EnumNotificationKind.resetMfaByAdmin,
                { userId, proceedBy: authContext.userId, snapshot }
            );
            const actorMetadata =
                this.userUtil.mapActivityLogActorMetadata(target);
            const targetMetadata = this.userUtil.mapActivityLogTargetMetadata(
                target,
                authContext.userId
            );
            const actorEntry = this.activityLogQueue.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminUserMfaReset,
                    metadata: actorMetadata,
                }
            );
            const targetEntry = this.activityLogQueue.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userMfaResetByAdmin,
                    userId,
                    createdBy: authContext.userId,
                    metadata: targetMetadata,
                }
            );
            await this.outboxService.addManyInTx(tx, [
                actorEntry,
                targetEntry,
                effect,
            ]);
        });

        return {};
    }
}
