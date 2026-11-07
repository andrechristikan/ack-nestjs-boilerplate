import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import type { RoleDto } from '@modules/role/dtos/role.dto';
import { RoleService } from '@modules/role/services/role.service';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { RoleUtil } from '@modules/role/utils/role.util';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class RoleCreateByAdminUseCase implements IAppUseCase<
    [RoleCreateRequestDto, IUser],
    IResponseReturn<RoleDto>
> {
    constructor(
        private readonly roleService: RoleService,
        private readonly roleUtil: RoleUtil,
        private readonly activityLogService: ActivityLogService,
        private readonly databaseUtil: DatabaseUtil,
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
        body: RoleCreateRequestDto,
        user: IUser
    ): Promise<IResponseReturn<RoleDto>> {
        const roleId = this.databaseUtil.createId();
        const activityLogs = [
            this.prepareActivityLog(EnumActivityLogAction.adminRoleCreate, {
                id: roleId,
                name: body.name,
                type: body.type,
                isImmutable: false,
            }),
        ];

        const created = await this.roleService.createByAdmin(
            roleId,
            {
                name: body.name,
                description: body.description ?? null,
                type: body.type,
            },
            { roleId: user.roleId, roleType: user.role.type }
        );

        this.activityLogService.stagePrepared(activityLogs);

        return { data: created };
    }
}
