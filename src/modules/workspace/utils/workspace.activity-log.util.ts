import { DatabaseUtil } from '@common/database/utils/database.util';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { Injectable } from '@nestjs/common';

/** Shared `ActivityLog.create` args builder for every workspace repository (`workspaceId` scoped). */
@Injectable()
export class WorkspaceActivityLogUtil {
    constructor(
        private readonly activityLogUtil: ActivityLogUtil,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    buildCreateArgs(
        actorId: string,
        workspaceId: string,
        action: EnumActivityLogAction,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Prisma.ActivityLogCreateArgs {
        return {
            data: {
                userId: actorId,
                workspaceId,
                action,
                description: this.activityLogUtil.getDescription(action),
                ipAddress,
                userAgent: this.databaseUtil.toPlainObject(userAgent),
                geoLocation: this.databaseUtil.toPlainObject(geoLocation),
                createdBy: actorId,
            },
        };
    }
}
