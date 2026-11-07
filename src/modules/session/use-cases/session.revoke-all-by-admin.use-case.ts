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
export class SessionRevokeAllByAdminUseCase implements IAppUseCase<
    [string, IUser],
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

    async execute(userId: string, user: IUser): Promise<IResponseReturn<void>> {
        this.sessionService.assertNotSelf(userId, user.id);

        // Sequential by design: gate before the work it guards
        const targetRole = await this.roleService.getOneByUserId(userId);
        this.roleService.assertActorOutranks(user.role.type, targetRole.type);

        const revokedAt = this.helperDateService.create();
        const sessions = await this.sessionService.revokeAllByAdmin(
            userId,
            user.id,
            revokedAt
        );

        const actorMetadata =
            this.sessionUtil.mapActivityLogRevokeAllActorMetadata(
                userId,
                sessions.length
            );
        const targetMetadata =
            this.sessionUtil.mapActivityLogRevokeAllTargetMetadata(
                user.id,
                sessions.length
            );
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.adminSessionRevokeAll,
                metadata: actorMetadata,
            }),
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userRevokeAllSessionsByAdmin,
                userId,
                createdBy: user.id,
                metadata: targetMetadata,
            }),
        ];

        await this.sessionQueue.purgeLogins(userId, sessions);

        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
