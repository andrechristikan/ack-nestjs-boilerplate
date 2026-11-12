import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import type { IOutboxEffect } from '@modules/outbox/interfaces/outbox.interface';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { RoleService } from '@modules/role/services/role.service';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { SessionService } from '@modules/session/services/session.service';
import { SessionUtil } from '@modules/session/utils/session.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { UserStatusInvalidException } from '@modules/user/exceptions/user.status-invalid.exception';
import type { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import { UserService } from '@modules/user/services/user.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserUpdateStatusByAdminUseCase implements IAppUseCase<
    [IRequestContextUser, string, UserUpdateStatusRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly userService: UserService,
        private readonly roleService: RoleService,
        private readonly sessionService: SessionService,
        private readonly activityLogService: ActivityLogService,
        private readonly sessionUtil: SessionUtil,
        private readonly userUtil: UserUtil,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(
        context: IRequestContextUser,
        userId: string,
        { status }: UserUpdateStatusRequestDto
    ): Promise<IResponseReturn<void>> {
        const user = context.user;
        this.userService.assertNotSelf(userId, user.id);

        const target = await this.userService.getOneWithRole(userId);
        this.roleService.assertActorOutranks(user.role.type, target.role.type);
        this.userService.assertUnblocked(target);

        const now = this.helperDateService.create();
        const revokesSessions = this.userService.revokesSessionsOn(status);
        const action = this.userService.resolveStatusActivityLogAction(status);
        try {
            await this.outboxService.withTransaction(async tx => {
                const row = await this.userService.updateStatusByAdminInTx(
                    tx,
                    target,
                    status
                );
                let revoked: ISessionRef[] = [];
                if (revokesSessions) {
                    revoked = await this.sessionService.revokeActiveByUserInTx(
                        tx,
                        userId,
                        user.id,
                        now
                    );
                }

                const entries: IOutboxEffect[] = [];
                if (revoked.length > 0) {
                    const revokeAllActorMetadata =
                        this.sessionUtil.mapActivityLogRevokeAllActorMetadata(
                            userId,
                            revoked.length
                        );
                    const revokeAllTargetMetadata =
                        this.sessionUtil.mapActivityLogRevokeAllTargetMetadata(
                            user.id,
                            revoked.length
                        );
                    const revokeAllActorEntry =
                        this.activityLogService.recordEffect(context.snapshot, {
                            action: EnumActivityLogAction.adminSessionRevokeAll,
                            metadata: revokeAllActorMetadata,
                        });
                    const revokeAllTargetEntry =
                        this.activityLogService.recordEffect(context.snapshot, {
                            action: EnumActivityLogAction.userRevokeAllSessionsByAdmin,
                            userId,
                            createdBy: user.id,
                            metadata: revokeAllTargetMetadata,
                        });
                    entries.push(revokeAllActorEntry, revokeAllTargetEntry);
                }

                const actorMetadata =
                    this.userUtil.mapActivityLogActorMetadata(row);
                const targetMetadata =
                    this.userUtil.mapActivityLogTargetMetadata(row, user.id);
                const actorEntry = this.activityLogService.recordEffect(
                    context.snapshot,
                    {
                        action: EnumActivityLogAction.adminUserUpdateStatus,
                        metadata: actorMetadata,
                    }
                );
                const targetEntry = this.activityLogService.recordEffect(
                    context.snapshot,
                    {
                        action,
                        userId,
                        createdBy: user.id,
                        metadata: targetMetadata,
                    }
                );
                entries.push(actorEntry, targetEntry);
                await this.outboxService.addManyInTx(tx, entries);
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new UserStatusInvalidException();
            }

            throw new AppUnknownException(err);
        }

        return {};
    }
}
