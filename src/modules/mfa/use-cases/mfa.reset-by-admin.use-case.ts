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
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { NotificationService } from '@modules/notification/services/notification.service';
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
        IPolicyContext,
        string,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly mfaService: MfaService,
        private readonly userService: UserService,
        private readonly roleService: RoleService,
        private readonly sessionService: SessionService,
        private readonly notificationService: NotificationService,
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

        await this.mfaService.assertHasFactor(userId);

        const now = this.helperDateService.create();
        await this.outboxService.withTransaction(async tx => {
            const [snapshot] = await Promise.all([
                this.notificationService.getSnapshot(target),
                this.mfaService.resetByAdminInTx(tx, userId),
            ]);
            await this.sessionService.revokeActiveByUserInTx(
                tx,
                userId,
                authContext.userId,
                now
            );
            const effect = this.notificationService.notify(
                EnumNotificationKind.resetMfaByAdmin,
                { userId, proceedBy: authContext.userId, snapshot }
            );
            const actorMetadata =
                this.userUtil.mapActivityLogActorMetadata(target);
            const targetMetadata = this.userUtil.mapActivityLogTargetMetadata(
                target,
                authContext.userId
            );
            const actorEntry = this.activityLogService.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminUserResetMfa,
                    metadata: actorMetadata,
                }
            );
            const targetEntry = this.activityLogService.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userResetMfaByAdmin,
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
