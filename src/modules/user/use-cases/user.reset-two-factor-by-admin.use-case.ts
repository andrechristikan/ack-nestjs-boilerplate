import { OutboxService } from '@modules/outbox/services/outbox.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { RoleService } from '@modules/role/services/role.service';
import { SessionService } from '@modules/session/services/session.service';
import { UserService } from '@modules/user/services/user.service';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserResetTwoFactorByAdminUseCase implements IAppUseCase<
    [string, IUser],
    IResponseReturn<void>
> {
    constructor(
        private readonly userTwoFactorService: UserTwoFactorService,
        private readonly userService: UserService,
        private readonly roleService: RoleService,
        private readonly sessionService: SessionService,
        private readonly notificationService: NotificationService,
        private readonly activityLogService: ActivityLogService,
        private readonly notificationQueue: NotificationQueue,
        private readonly userUtil: UserUtil,
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(userId: string, user: IUser): Promise<IResponseReturn<void>> {
        this.userService.assertNotSelf(userId, user.id);

        // Sequential by design: gate before the work it guards; write must not run if an earlier step throws
        const target = await this.userService.getOneWithRole(userId);
        this.roleService.assertActorOutranks(user.role.type, target.role.type);
        this.userService.assertUnblocked(target);

        this.userTwoFactorService.assertEnabled(target);

        const actorMetadata = this.userUtil.mapActivityLogActorMetadata(target);
        const targetMetadata = this.userUtil.mapActivityLogTargetMetadata(
            target,
            user.id
        );
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.adminUserResetTwoFactor,
                metadata: actorMetadata,
            }),
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userResetTwoFactorByAdmin,
                userId,
                createdBy: user.id,
                metadata: targetMetadata,
            }),
        ];

        const recipient = await this.notificationService.getRecipient(
            target,
            EnumNotificationKind.resetTwoFactorByAdmin
        );
        const now = this.helperDateService.create();
        await this.outboxService.withTransaction(async tx => {
            await this.userTwoFactorService.resetByAdminInTx(tx, userId);
            await this.sessionService.revokeActiveByUserInTx(
                tx,
                userId,
                user.id,
                now
            );
        });
        await this.notificationQueue.sendResetTwoFactorByAdmin(
            recipient,
            user.id
        );

        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
