import { subject } from '@casl/ability';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
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
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import { PolicyNotFoundException } from '@modules/policy/exceptions/policy.not-found.exception';
import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import { PolicyService } from '@modules/policy/services/policy.service';
import { PolicyUtil } from '@modules/policy/utils/policy.util';
import { RoleService } from '@modules/role/services/role.service';
import type { IUserContext } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PolicyUpdateByAdminUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        IPolicyContext,
        string,
        string,
        PolicyUpdateRequestDto,
    ],
    IResponseReturn<PolicyDto>
> {
    constructor(
        private readonly policyService: PolicyService,
        private readonly policyAbilityService: PolicyAbilityService,
        private readonly roleService: RoleService,
        private readonly policyUtil: PolicyUtil,
        private readonly activityLogService: ActivityLogService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        policyContext: IPolicyContext,
        roleId: string,
        id: string,
        body: PolicyUpdateRequestDto
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
        const data = {
            action: body.action,
            conditions: body.conditions,
            inverted: body.inverted,
            reason: body.reason,
        };
        const existing = await this.policyService.getOneByRoleIdAndId(
            roleId,
            id
        );
        this.policyService.validateRule(role.scope, {
            ...data,
            subject: existing.subject,
        });

        try {
            const updated = await this.outboxService.withTransaction(
                async tx => {
                    const policy = await this.policyService.updateByAdminInTx(
                        tx,
                        roleId,
                        id,
                        data
                    );
                    await this.roleService.bumpPolicyRevisionInTx(tx, roleId);

                    const metadata =
                        this.policyUtil.mapActivityLogMetadata(policy);
                    const effect = this.activityLogService.recordEffect(
                        requestContext,
                        apiKeyContext,
                        authContext,
                        null,
                        {
                            action: EnumActivityLogAction.adminPolicyUpdate,
                            metadata,
                        }
                    );
                    await this.outboxService.addInTx(tx, effect);

                    return policy;
                }
            );

            return { data: updated };
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }
            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new PolicyNotFoundException();
            }
            throw new AppUnknownException(err);
        }
    }
}
