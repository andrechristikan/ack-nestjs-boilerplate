import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { RoleService } from '@modules/role/services/role.service';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { SessionService } from '@modules/session/services/session.service';
import { SessionUtil } from '@modules/session/utils/session.util';
import { UserUtil } from '@modules/user/utils/user.util';
import type { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import { UserService } from '@modules/user/services/user.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@Injectable()
export class UserUpdateStatusByAdminUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        string,
        UserUpdateStatusRequestDto,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly userService: UserService,
        private readonly roleService: RoleService,
        private readonly sessionService: SessionService,
        private readonly mfaService: MfaService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly sessionUtil: SessionUtil,
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
        userId: string,
        { status }: UserUpdateStatusRequestDto
    ): Promise<IResponseReturn<void>> {
        this.userService.assertNotSelf(userId, authContext.userId);

        const target = await this.userService.getOneWithRole(userId);
        this.roleService.assertActorOutranks(
            userContext.user.role.type,
            target.role.type
        );
        this.userService.assertUnblocked(target);
        this.userService.assertStatusChangeable(target, status);

        const now = this.helperDateService.now();
        const revokesSessions = this.userService.revokesSessionsOn(status);
        const resetsMfaAttempt = this.userService.resetsMfaAttemptOn(status);
        const action = this.userService.resolveStatusActivityLogAction(status);
        await this.databaseService.withTransaction(async tx => {
            const row = await this.userService.updateStatusByAdminInTx(
                tx,
                target,
                status
            );
            let revoke: Promise<ISessionRef[]> = Promise.resolve([]);
            if (revokesSessions) {
                revoke = this.sessionService.revokeActiveByUserInTx(
                    tx,
                    userId,
                    authContext.userId,
                    now
                );
            }

            let resetMfaAttempt: Promise<void> = Promise.resolve();
            if (resetsMfaAttempt) {
                resetMfaAttempt = this.mfaService.resetAttemptInTx(tx, userId);
            }

            const [revoked] = await Promise.all([revoke, resetMfaAttempt]);

            const entries: IOutboxEffect[] = [];
            if (revoked.length > 0) {
                const revokeAllActorMetadata =
                    this.sessionUtil.mapActivityLogRevokeAllActorMetadata(
                        userId,
                        revoked.length
                    );
                const revokeAllTargetMetadata =
                    this.sessionUtil.mapActivityLogRevokeAllTargetMetadata(
                        authContext.userId,
                        revoked.length
                    );
                const revokeAllActorEntry = this.activityLogQueue.recordEffect(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    null,
                    {
                        action: EnumActivityLogAction.adminAllSessionsRevoked,
                        metadata: revokeAllActorMetadata,
                    }
                );
                const revokeAllTargetEntry = this.activityLogQueue.recordEffect(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    null,
                    {
                        action: EnumActivityLogAction.userAllSessionsRevokedByAdmin,
                        userId,
                        createdBy: authContext.userId,
                        metadata: revokeAllTargetMetadata,
                    }
                );
                entries.push(revokeAllActorEntry, revokeAllTargetEntry);
            }

            const actorMetadata =
                this.userUtil.mapActivityLogActorMetadata(row);
            const targetMetadata = this.userUtil.mapActivityLogTargetMetadata(
                row,
                authContext.userId
            );
            const actorEntry = this.activityLogQueue.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminUserStatusUpdated,
                    metadata: actorMetadata,
                }
            );
            const targetEntry = this.activityLogQueue.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action,
                    userId,
                    createdBy: authContext.userId,
                    metadata: targetMetadata,
                }
            );
            entries.push(actorEntry, targetEntry);
            await this.outboxService.addManyInTx(tx, entries);
        });

        return {};
    }
}
