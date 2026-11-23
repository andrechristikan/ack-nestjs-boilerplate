import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
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
        IPolicyContext,
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
        private readonly roleService: RoleService,
        private readonly activityLogService: ActivityLogService,
        private readonly userUtil: UserUtil,
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService,
        private readonly policyAbilityService: PolicyAbilityService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        policyContext: IPolicyContext,
        userId: string
    ): Promise<IResponseReturn<void>> {
        this.userService.assertNotSelf(userId, authContext.userId);

        // Sequential by design: gate before the work it guards; write must not run if an earlier step throws
        const additionalWhere = this.policyAbilityService.scope(
            policyContext,
            EnumPolicyAction.update,
            EnumPolicySubject.User
        );
        const target = await this.userService.getOneWithRole(
            userId,
            additionalWhere
        );
        this.roleService.assertActorOutranks(
            userContext.user.role.key,
            target.role
        );
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
                    authContext.userId
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
                authContext.userId
            );
            await this.userPasswordService.markUnusedResetsUsedInTx(
                tx,
                userId,
                authContext.userId
            );
            await this.sessionService.revokeActiveByUserInTx(
                tx,
                userId,
                authContext.userId,
                password.passwordCreated
            );
            const effect = this.notificationService.notify(
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
            const actorEntry = this.activityLogService.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminUserUpdatePassword,
                    metadata: actorMetadata,
                }
            );
            const targetEntry = this.activityLogService.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userUpdatePasswordByAdmin,
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
