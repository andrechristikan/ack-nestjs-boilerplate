import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { RoleService } from '@modules/role/services/role.service';
import { SessionService } from '@modules/session/services/session.service';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { SessionUtil } from '@modules/session/utils/session.util';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class SessionRevokeByAdminUseCase implements IAppUseCase<
    [string, string, IUser],
    IResponseReturn<void>
> {
    constructor(
        private readonly sessionService: SessionService,
        private readonly roleService: RoleService,
        private readonly activityLogService: ActivityLogService,
        private readonly sessionQueue: SessionQueue,
        private readonly sessionUtil: SessionUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(
        userId: string,
        sessionId: string,
        user: IUser
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards
        const targetRole = await this.roleService.getOneByUserId(userId);
        this.roleService.assertActorOutranks(user.role.type, targetRole.type);

        const revokedAt = this.helperDateService.create();
        const session = await this.sessionService.revokeByAdmin(
            userId,
            sessionId,
            user.id,
            revokedAt
        );

        const actorMetadata = this.sessionUtil.mapActivityLogActorMetadata(
            session,
            revokedAt
        );
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.adminSessionRevoke,
                metadata: actorMetadata,
            }),
        ];
        if (userId !== user.id) {
            const targetMetadata =
                this.sessionUtil.mapActivityLogTargetMetadata(
                    session,
                    user.id,
                    revokedAt
                );
            const targetActivityLog = this.activityLogService.prepare({
                action: EnumActivityLogAction.userRevokeSessionByAdmin,
                userId,
                createdBy: user.id,
                metadata: targetMetadata,
            });
            activityLogs.push(targetActivityLog);
        }

        await this.sessionQueue.purgeLogins(userId, [{ id: sessionId }]);

        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
