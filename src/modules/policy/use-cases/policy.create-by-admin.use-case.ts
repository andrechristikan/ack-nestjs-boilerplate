import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import type { PolicyDto } from '@modules/policy/dtos/policy.dto';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import { PolicyService } from '@modules/policy/services/policy.service';
import { PolicyUtil } from '@modules/policy/utils/policy.util';
import { RoleService } from '@modules/role/services/role.service';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class PolicyCreateByAdminUseCase implements IAppUseCase<
    [string, PolicyRequestDto, IUser],
    IResponseReturn<PolicyDto>
> {
    constructor(
        private readonly policyService: PolicyService,
        private readonly roleService: RoleService,
        private readonly policyUtil: PolicyUtil,
        private readonly activityLogService: ActivityLogService
    ) {}

    private prepareActivityLog(
        action: EnumActivityLogAction,
        policy: Policy
    ): IActivityLogStaged {
        const metadata = this.policyUtil.mapActivityLogMetadata(policy);

        return this.activityLogService.prepare({ action, metadata });
    }

    async execute(
        roleId: string,
        body: PolicyRequestDto,
        user: IUser
    ): Promise<IResponseReturn<PolicyDto>> {
        // Sequential by design: gate before the work it guards
        await this.roleService.assertWritableByActor(roleId, {
            roleId: user.roleId,
            roleType: user.role.type,
        });

        const created = await this.policyService.createByAdmin(roleId, body);
        const activityLogs = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminPolicyCreate,
                created
            ),
        ];

        this.activityLogService.stagePrepared(activityLogs);

        return { data: created };
    }
}
