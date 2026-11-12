import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { PolicyNotFoundException } from '@modules/policy/exceptions/policy.not-found.exception';
import { PolicyService } from '@modules/policy/services/policy.service';
import { PolicyUtil } from '@modules/policy/utils/policy.util';
import { RoleService } from '@modules/role/services/role.service';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class PolicyDeleteByAdminUseCase implements IAppUseCase<
    [string, string, IUser, IRequestContext],
    IResponseReturn<void>
> {
    constructor(
        private readonly policyService: PolicyService,
        private readonly roleService: RoleService,
        private readonly policyUtil: PolicyUtil,
        private readonly activityLogService: ActivityLogService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async execute(
        roleId: string,
        id: string,
        user: IUser,
        context: IRequestContext
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards
        await this.roleService.assertWritableByActor(roleId, {
            roleId: user.roleId,
            roleType: user.role.type,
        });

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
                    {
                        action: EnumActivityLogAction.adminPolicyDelete,
                        metadata,
                    },
                    context
                );
                await this.outboxService.addInTx(tx, effect);
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
