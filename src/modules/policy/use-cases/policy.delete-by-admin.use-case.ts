import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { PolicyNotFoundException } from '@modules/policy/exceptions/policy.not-found.exception';
import { subject } from '@casl/ability';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import { PolicyService } from '@modules/policy/services/policy.service';
import { PolicyUtil } from '@modules/policy/utils/policy.util';
import { RoleService } from '@modules/role/services/role.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@Injectable()
export class PolicyDeleteByAdminUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        IPolicyContext,
        string,
        string,
    ],
    IResponseReturn<void>
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
        id: string
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards
        const additionalWhere = this.policyAbilityService.scope(
            policyContext,
            EnumPolicyAction.read,
            EnumPolicySubject.Role
        );
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

        try {
            await this.outboxService.withTransaction(async tx => {
                const deleted = await this.policyService.deleteByAdminInTx(
                    tx,
                    roleId,
                    id
                );

                const metadata =
                    this.policyUtil.mapActivityLogMetadata(deleted);
                const effect = this.activityLogService.recordEffect(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    null,
                    {
                        action: EnumActivityLogAction.adminPolicyDelete,
                        metadata,
                    }
                );
                await this.outboxService.addInTx(tx, effect);
                await this.roleService.bumpPolicyRevisionInTx(tx, roleId);
            });

            return {};
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
