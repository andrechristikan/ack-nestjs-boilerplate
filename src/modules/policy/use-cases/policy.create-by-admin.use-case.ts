import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import type { PolicyDto } from '@modules/policy/dtos/policy.dto';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import { PolicyService } from '@modules/policy/services/policy.service';
import { PolicyUtil } from '@modules/policy/utils/policy.util';
import { RoleService } from '@modules/role/services/role.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class PolicyCreateByAdminUseCase implements IAppUseCase<
    [IRequestContextUser, string, PolicyRequestDto],
    IResponseReturn<PolicyDto>
> {
    constructor(
        private readonly policyService: PolicyService,
        private readonly roleService: RoleService,
        private readonly policyUtil: PolicyUtil,
        private readonly activityLogService: ActivityLogService,
        private readonly outboxService: OutboxService
    ) {}

    async execute(
        context: IRequestContextUser,
        roleId: string,
        body: PolicyRequestDto
    ): Promise<IResponseReturn<PolicyDto>> {
        // Sequential by design: gate before the work it guards
        await this.roleService.assertWritableByActor(roleId, {
            roleId: context.user.roleId,
            roleType: context.user.role.type,
        });

        const created = await this.outboxService.withTransaction(async tx => {
            const policy = await this.policyService.createByAdminInTx(
                tx,
                roleId,
                body
            );

            const metadata = this.policyUtil.mapActivityLogMetadata(policy);
            const effect = this.activityLogService.recordEffect(
                context.snapshot,
                {
                    action: EnumActivityLogAction.adminPolicyCreate,
                    metadata,
                }
            );
            await this.outboxService.addInTx(tx, effect);

            return policy;
        });

        return { data: created };
    }
}
