import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { User } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { RoleService } from '@modules/role/services/role.service';
import { SessionService } from '@modules/session/services/session.service';
import { SessionQueue } from '@modules/session/queues/session.queue';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { SessionUtil } from '@modules/session/utils/session.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { UserStatusInvalidException } from '@modules/user/exceptions/user.status-invalid.exception';
import type { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserService } from '@modules/user/services/user.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserUpdateStatusByAdminUseCase implements IAppUseCase<
    [string, UserUpdateStatusRequestDto, IUser],
    IResponseReturn<void>
> {
    constructor(
        private readonly userService: UserService,
        private readonly roleService: RoleService,
        private readonly sessionService: SessionService,
        private readonly activityLogService: ActivityLogService,
        private readonly sessionQueue: SessionQueue,
        private readonly sessionUtil: SessionUtil,
        private readonly userUtil: UserUtil,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(
        userId: string,
        { status }: UserUpdateStatusRequestDto,
        user: IUser
    ): Promise<IResponseReturn<void>> {
        this.userService.assertNotSelf(userId, user.id);

        // Sequential by design: gate before the work it guards
        const target = await this.userService.getOneWithRole(userId);
        this.roleService.assertActorOutranks(user.role.type, target.role.type);
        this.userService.assertUnblocked(target);

        const now = this.helperDateService.create();
        const revokesSessions = this.userUtil.revokesSessionsOn(status);
        let row: User;
        let revoked: ISessionRef[] | null;
        try {
            ({ row, revoked } = await this.databaseService.withTransaction(
                async tx => {
                    const updated =
                        await this.userService.updateStatusByAdminInTx(
                            tx,
                            target,
                            status
                        );
                    if (!revokesSessions) {
                        return { row: updated, revoked: null };
                    }

                    const sessions =
                        await this.sessionService.revokeActiveByUserInTx(
                            tx,
                            userId,
                            user.id,
                            now
                        );

                    return { row: updated, revoked: sessions };
                }
            ));
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

        const action = this.userUtil.resolveStatusActivityLogAction(status);
        const actorMetadata = this.userUtil.mapActivityLogActorMetadata(row);
        const targetMetadata = this.userUtil.mapActivityLogTargetMetadata(
            row,
            user.id
        );
        const statusActivityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.adminUserUpdateStatus,
                metadata: actorMetadata,
            }),
            this.activityLogService.prepare({
                action,
                userId,
                createdBy: user.id,
                metadata: targetMetadata,
            }),
        ];
        if (revoked !== null) {
            await this.sessionQueue.purgeLogins(userId, revoked);

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
                const revokeAllActivityLogs = [
                    this.activityLogService.prepare({
                        action: EnumActivityLogAction.adminSessionRevokeAll,
                        metadata: revokeAllActorMetadata,
                    }),
                    this.activityLogService.prepare({
                        action: EnumActivityLogAction.userRevokeAllSessionsByAdmin,
                        userId,
                        createdBy: user.id,
                        metadata: revokeAllTargetMetadata,
                    }),
                ];
                this.activityLogService.stagePrepared(revokeAllActivityLogs);
            }
        }

        this.activityLogService.stagePrepared(statusActivityLogs);

        return {};
    }
}
