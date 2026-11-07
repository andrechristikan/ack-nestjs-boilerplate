import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import type { RoleDto } from '@modules/role/dtos/role.dto';
import { RoleService } from '@modules/role/services/role.service';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { RoleUtil } from '@modules/role/utils/role.util';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class RoleUpdateByAdminUseCase implements IAppUseCase<
    [string, RoleUpdateRequestDto, IUser],
    IResponseReturn<RoleDto>
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

    async execute(
        id: string,
        body: RoleUpdateRequestDto,
        user: IUser
    ): Promise<IResponseReturn<RoleDto>> {
        const updated = await this.roleService.updateByAdmin(
            id,
            {
                description: body.description,
                type: body.type,
            },
            { roleId: user.roleId, roleType: user.role.type }
        );
        const activityLogs = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminRoleUpdate,
                updated
            ),
        ];

        this.activityLogService.stagePrepared(activityLogs);

        return { data: updated };
    }
}
