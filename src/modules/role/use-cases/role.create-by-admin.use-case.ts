import { subject } from '@casl/ability';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import {
    EnumActivityLogAction,
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import type { RoleDto } from '@modules/role/dtos/role.dto';
import { RoleService } from '@modules/role/services/role.service';
import { RoleUtil } from '@modules/role/utils/role.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@Injectable()
export class RoleCreateByAdminUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        IPolicyContext,
        RoleCreateRequestDto,
    ],
    IResponseReturn<RoleDto>
> {
    constructor(
        private readonly roleService: RoleService,
        private readonly roleUtil: RoleUtil,
        private readonly activityLogService: ActivityLogService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly policyAbilityService: PolicyAbilityService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        policyContext: IPolicyContext,
        body: RoleCreateRequestDto
    ): Promise<IResponseReturn<RoleDto>> {
        this.policyAbilityService.authorize(
            policyContext,
            EnumPolicyAction.create,
            subject(EnumPolicySubject.Role, {
                scope: body.scope,
                key: body.key,
            })
        );
        const roleId = this.databaseUtil.createId();
        const created = await this.outboxService.withTransaction(async tx => {
            const role = await this.roleService.createByAdminInTx(
                tx,
                roleId,
                {
                    scope: body.scope,
                    key: body.key,
                    name: body.name,
                    description: body.description ?? null,
                },
                {
                    roleId: userContext.user.roleId,
                    roleKey: userContext.user.role.key,
                }
            );

            const timestamp = this.helperDateService.create();
            const metadata = this.roleUtil.mapActivityLogMetadata(
                role,
                timestamp
            );
            const effect = this.activityLogService.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminRoleCreate,
                    metadata,
                }
            );
            await this.outboxService.addInTx(tx, effect);

            return role;
        });

        return { data: created };
    }
}
