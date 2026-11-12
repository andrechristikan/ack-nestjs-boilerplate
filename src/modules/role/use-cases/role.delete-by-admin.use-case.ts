import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { RoleUsedException } from '@modules/role/exceptions/role.used.exception';
import { RoleService } from '@modules/role/services/role.service';
import { RoleUtil } from '@modules/role/utils/role.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class RoleDeleteByAdminUseCase implements IAppUseCase<
    [IRequestContextUser, string],
    IResponseReturn<void>
> {
    constructor(
        private readonly roleService: RoleService,
        private readonly roleUtil: RoleUtil,
        private readonly activityLogService: ActivityLogService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(
        context: IRequestContextUser,
        id: string
    ): Promise<IResponseReturn<void>> {
        try {
            await this.outboxService.withTransaction(async tx => {
                const deleted = await this.roleService.deleteByAdminInTx(
                    tx,
                    id,
                    {
                        roleId: context.user.roleId,
                        roleType: context.user.role.type,
                    }
                );

                const timestamp = this.helperDateService.create();
                const metadata = this.roleUtil.mapActivityLogMetadata(
                    deleted,
                    timestamp
                );
                const effect = this.activityLogService.recordEffect(
                    context.snapshot,
                    {
                        action: EnumActivityLogAction.adminRoleDelete,
                        metadata,
                    }
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
                throw new RoleUsedException();
            }

            throw new AppUnknownException(err);
        }
    }
}
