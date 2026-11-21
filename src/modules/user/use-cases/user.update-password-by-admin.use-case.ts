import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
} from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { RoleService } from '@modules/role/services/role.service';
import { SessionService } from '@modules/session/services/session.service';
import { UserService } from '@modules/user/services/user.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@Injectable()
export class UserUpdatePasswordByAdminUseCase implements IAppUseCase<
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
        private readonly userService: UserService,
        private readonly userPasswordService: UserPasswordService,
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly sessionService: SessionService,
        private readonly notificationService: NotificationService,
        private readonly notificationQueue: NotificationQueue,
        private readonly roleService: RoleService,
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
        this.userService.assertEmailDeliverable();

        this.userService.assertNotSelf(userId, authContext.userId);

        // Sequential by design: a cheap check before the expensive or external work it guards
        const target = await this.userService.getOneWithRole(userId);
        this.roleService.assertActorOutranks(
            userContext.user.role.type,
            target.role.type
        );
        this.userService.assertUnblocked(target);

        const [{ password, passwordString }, snapshot] = await Promise.all([
            this.userPasswordService.createTemporaryPassword(),
            this.notificationService.getSnapshot(target),
        ]);
        const passwordCreatedAt = this.helperDateService.formatToIso(
            password.passwordCreated
        );
        const passwordExpiredAt = this.helperDateService.formatToIso(
            password.passwordExpired
        );

        await this.databaseService.withTransaction(async tx => {
            const [updated] = await Promise.all([
                this.userService.updatePasswordInTx(
                    tx,
                    userId,
                    password,
                    authContext.userId
                ),
                this.passwordHistoryService.createInTx(
                    tx,
                    userId,
                    password.passwordHash,
                    EnumPasswordHistoryType.admin,
                    password.passwordPeriodExpired,
                    password.passwordCreated,
                    authContext.userId
                ),
                this.userPasswordService.markUnusedResetsUsedInTx(
                    tx,
                    userId,
                    authContext.userId
                ),
                this.sessionService.revokeActiveByUserInTx(
                    tx,
                    userId,
                    authContext.userId,
                    password.passwordCreated
                ),
            ]);
            const effect = this.notificationQueue.notify(
                EnumNotificationKind.temporaryPasswordByAdmin,
                {
                    userId,
                    proceedBy: authContext.userId,
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
                authContext.userId
            );
            const actorEntry = this.activityLogQueue.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminUserPasswordUpdated,
                    metadata: actorMetadata,
                }
            );
            const targetEntry = this.activityLogQueue.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userPasswordUpdatedByAdmin,
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
