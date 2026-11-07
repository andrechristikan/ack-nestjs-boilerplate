import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { RoleService } from '@modules/role/services/role.service';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { RoleUtil } from '@modules/role/utils/role.util';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class RoleDeleteByAdminUseCase implements IAppUseCase<
    [string, IUser],
    IResponseReturn<void>
> {
    constructor(
        private readonly roleService: RoleService,
        private readonly roleUtil: RoleUtil,
        private readonly activityLogService: ActivityLogService,
        private readonly helperDateService: HelperDateService
    ) {}

    private prepareActivityLog(
        action: EnumActivityLogAction,
        role: IRole
    ): IActivityLogStaged {
        const timestamp = this.helperDateService.create();
        const metadata = this.roleUtil.mapActivityLogMetadata(role, timestamp);

        return this.activityLogService.prepare({
            action,
            metadata,
        });
    }

    async execute(id: string, user: IUser): Promise<IResponseReturn<void>> {
        const deleted = await this.roleService.deleteByAdmin(id, {
            roleId: user.roleId,
            roleType: user.role.type,
        });
        const activityLogs = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminRoleDelete,
                deleted
            ),
        ];

        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
