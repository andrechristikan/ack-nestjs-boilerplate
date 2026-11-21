import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { PolicyDto } from '@modules/policy/dtos/policy.dto';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import { PolicyExistException } from '@modules/policy/exceptions/policy.exist.exception';
import { PolicyService } from '@modules/policy/services/policy.service';
import { PolicyUtil } from '@modules/policy/utils/policy.util';
import { RoleService } from '@modules/role/services/role.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@Injectable()
export class PolicyCreateByAdminUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        string,
        PolicyRequestDto,
    ],
    IResponseReturn<PolicyDto>
> {
    constructor(
        private readonly policyService: PolicyService,
        private readonly roleService: RoleService,
        private readonly policyUtil: PolicyUtil,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        roleId: string,
        body: PolicyRequestDto
    ): Promise<IResponseReturn<PolicyDto>> {
        const role = await this.roleService.getWritableByActor(roleId, {
            roleId: userContext.user.roleId,
            roleType: userContext.user.role.type,
        });
        this.policyService.assertRoleTypeAllowed(role.type);

        try {
            const created = await this.databaseService.withTransaction(
                async tx => {
                    const policy = await this.policyService.createByAdminInTx(
                        tx,
                        roleId,
                        body
                    );

                    const metadata =
                        this.policyUtil.mapActivityLogMetadata(policy);
                    const effect = this.activityLogQueue.recordEffect(
                        requestContext,
                        apiKeyContext,
                        authContext,
                        null,
                        {
                            action: EnumActivityLogAction.adminPolicyCreated,
                            metadata,
                        }
                    );
                    await this.outboxService.addManyInTx(tx, [
                        effect,
                        this.roleService.invalidateEffect(roleId),
                    ]);

                    return policy;
                }
            );

            return { data: created };
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const isSubjectCollision = this.databaseUtil.isUniqueCollision(
                err,
                'subject'
            );
            if (isSubjectCollision) {
                throw new PolicyExistException();
            }

            throw new AppUnknownException(err);
        }
    }
}
