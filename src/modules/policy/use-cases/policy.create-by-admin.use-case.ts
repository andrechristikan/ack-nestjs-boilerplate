import { subject } from '@casl/ability';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { PolicyDto } from '@modules/policy/dtos/policy.dto';
import type { PolicyCreateRequestDto } from '@modules/policy/dtos/request/policy.create.request.dto';
import type {
    IPolicyContext,
    IPolicyCreate,
} from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import { PolicyService } from '@modules/policy/services/policy.service';
import { PolicyUtil } from '@modules/policy/utils/policy.util';
import { RoleService } from '@modules/role/services/role.service';
import type { IUserContext } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PolicyCreateByAdminUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        IPolicyContext,
        string,
        PolicyCreateRequestDto,
    ],
    IResponseReturn<PolicyDto>
> {
    constructor(
        private readonly policyService: PolicyService,
        private readonly policyAbilityService: PolicyAbilityService,
        private readonly roleService: RoleService,
        private readonly policyUtil: PolicyUtil,
        private readonly activityLogService: ActivityLogService,
        private readonly outboxService: OutboxService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        policyContext: IPolicyContext,
        roleId: string,
        body: PolicyCreateRequestDto
    ): Promise<IResponseReturn<PolicyDto>> {
        const additionalWhere = this.policyAbilityService.scope(
            policyContext,
            EnumPolicyAction.read,
            EnumPolicySubject.Role
        );
        // Sequential by design: gate before the work it guards
        const role = await this.roleService.getWritableByActor(
            roleId,
            {
                roleId: userContext.user.roleId,
                roleKey: userContext.user.role.key,
            },
            additionalWhere
        );
        this.policyService.assertRoleWritable(role);
        this.policyAbilityService.authorize(
            policyContext,
            EnumPolicyAction.update,
            subject(EnumPolicySubject.Role, role)
        );
        const data: IPolicyCreate = {
            subject: body.subject,
            action: body.action,
            conditions: body.conditions ?? null,
            inverted: body.inverted ?? false,
            reason: body.reason ?? null,
        };
        this.policyService.validateRule(role.scope, data);

        const created = await this.outboxService.withTransaction(async tx => {
            const policy = await this.policyService.createByAdminInTx(
                tx,
                roleId,
                data
            );
            await this.roleService.bumpPolicyRevisionInTx(tx, roleId);

            const metadata = this.policyUtil.mapActivityLogMetadata(policy);
            const effect = this.activityLogService.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                null,
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
