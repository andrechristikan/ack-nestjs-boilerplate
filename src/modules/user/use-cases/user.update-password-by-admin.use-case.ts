import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { RoleService } from '@modules/role/services/role.service';
import { SessionService } from '@modules/session/services/session.service';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { UserService } from '@modules/user/services/user.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserUpdatePasswordByAdminUseCase implements IAppUseCase<
    [string, IUser],
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
        private readonly sessionQueue: SessionQueue,
        private readonly notificationQueue: NotificationQueue,
        private readonly userUtil: UserUtil,
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(userId: string, user: IUser): Promise<IResponseReturn<void>> {
        this.userService.assertNotSelf(userId, user.id);

        // Sequential by design: gate before the work it guards
        const target = await this.userService.getOneWithRole(userId);
        this.roleService.assertActorOutranks(user.role.type, target.role.type);
        this.userService.assertUnblocked(target);

        const [{ password, passwordString }, recipient] = await Promise.all([
            this.userPasswordService.createTemporaryPassword(),
            this.notificationService.getRecipient(
                target,
                EnumNotificationKind.temporaryPasswordByAdmin
            ),
        ]);

        // Sequential by design: write must not run if an earlier step throws
        const { row, passwordHistoryId, revoked } =
            await this.databaseService.withTransaction(async tx => {
                const row = await this.userService.updatePasswordInTx(
                    tx,
                    userId,
                    password,
                    user.id
                );
                const passwordHistory =
                    await this.passwordHistoryService.createInTx(
                        tx,
                        userId,
                        password.passwordHash,
                        EnumPasswordHistoryType.admin,
                        password.passwordPeriodExpired,
                        password.passwordCreated,
                        user.id
                    );
                await this.userPasswordService.markUnusedResetsUsedInTx(
                    tx,
                    userId
                );
                const revoked =
                    await this.sessionService.revokeActiveByUserInTx(
                        tx,
                        userId,
                        user.id,
                        password.passwordCreated
                    );

                return { row, passwordHistoryId: passwordHistory.id, revoked };
            });

        const actorMetadata = this.userUtil.mapActivityLogActorMetadata(row);
        const targetMetadata = this.userUtil.mapActivityLogTargetMetadata(
            row,
            user.id
        );
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.adminUserUpdatePassword,
                metadata: actorMetadata,
            }),
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userUpdatePasswordByAdmin,
                userId,
                createdBy: user.id,
                metadata: targetMetadata,
            }),
        ];
        const passwordCreatedAt = this.helperDateService.formatToIso(
            password.passwordCreated
        );
        const passwordExpiredAt = this.helperDateService.formatToIso(
            password.passwordExpired
        );
        await Promise.all([
            this.sessionQueue.purgeLogins(userId, revoked),
            this.notificationQueue.sendTemporaryPasswordByAdmin(
                recipient,
                {
                    password: passwordString,
                    passwordCreatedAt,
                    passwordExpiredAt,
                },
                user.id,
                passwordHistoryId
            ),
        ]);

        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
