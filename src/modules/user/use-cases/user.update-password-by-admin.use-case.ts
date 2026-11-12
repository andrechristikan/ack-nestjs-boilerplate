import { OutboxService } from '@modules/outbox/services/outbox.service';
import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { RoleService } from '@modules/role/services/role.service';
import { SessionService } from '@modules/session/services/session.service';
import { UserService } from '@modules/user/services/user.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserUpdatePasswordByAdminUseCase implements IAppUseCase<
    [IRequestContextUser, string],
    IResponseReturn<void>
> {
    constructor(
        private readonly userService: UserService,
        private readonly userPasswordService: UserPasswordService,
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly sessionService: SessionService,
        private readonly notificationService: NotificationService,
        private readonly roleService: RoleService,
        private readonly activityLogService: ActivityLogService,
        private readonly userUtil: UserUtil,
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(
        context: IRequestContextUser,
        userId: string
    ): Promise<IResponseReturn<void>> {
        const user = context.user;
        this.userService.assertNotSelf(userId, user.id);

        // Sequential by design: gate before the work it guards; write must not run if an earlier step throws
        const target = await this.userService.getOneWithRole(userId);
        this.roleService.assertActorOutranks(user.role.type, target.role.type);
        this.userService.assertUnblocked(target);

        const { password, passwordString } =
            await this.userPasswordService.createTemporaryPassword();
        const passwordCreatedAt = this.helperDateService.formatToIso(
            password.passwordCreated
        );
        const passwordExpiredAt = this.helperDateService.formatToIso(
            password.passwordExpired
        );

        await this.outboxService.withTransaction(async tx => {
            const [updated, snapshot] = await Promise.all([
                this.userService.updatePasswordInTx(
                    tx,
                    userId,
                    password,
                    user.id
                ),
                this.notificationService.getSnapshot(target),
            ]);
            await this.passwordHistoryService.createInTx(
                tx,
                userId,
                password.passwordHash,
                EnumPasswordHistoryType.admin,
                password.passwordPeriodExpired,
                password.passwordCreated,
                user.id
            );
            await this.userPasswordService.markUnusedResetsUsedInTx(tx, userId);
            await this.sessionService.revokeActiveByUserInTx(
                tx,
                userId,
                user.id,
                password.passwordCreated
            );
            const effect = this.notificationService.notify(
                EnumNotificationKind.temporaryPasswordByAdmin,
                {
                    userId,
                    proceedBy: user.id,
                    password: passwordString,
                    passwordCreatedAt,
                    passwordExpiredAt,
                    snapshot,
                }
            );
            const actorMetadata =
                this.userUtil.mapActivityLogActorMetadata(updated);
            const targetMetadata = this.userUtil.mapActivityLogTargetMetadata(
                updated,
                user.id
            );
            const actorEntry = this.activityLogService.recordEffect(
                context.snapshot,
                {
                    action: EnumActivityLogAction.adminUserUpdatePassword,
                    metadata: actorMetadata,
                }
            );
            const targetEntry = this.activityLogService.recordEffect(
                context.snapshot,
                {
                    action: EnumActivityLogAction.userUpdatePasswordByAdmin,
                    userId,
                    createdBy: user.id,
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
