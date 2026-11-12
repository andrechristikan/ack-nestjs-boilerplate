import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import type { RoleDto } from '@modules/role/dtos/role.dto';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleService } from '@modules/role/services/role.service';
import { RoleUtil } from '@modules/role/utils/role.util';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class RoleUpdateByAdminUseCase implements IAppUseCase<
    [string, RoleUpdateRequestDto, IUser, IRequestContext],
    IResponseReturn<RoleDto>
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
        id: string,
        body: RoleUpdateRequestDto,
        user: IUser,
        context: IRequestContext
    ): Promise<IResponseReturn<RoleDto>> {
        try {
            const updated = await this.outboxService.withTransaction(
                async tx => {
                    const role = await this.roleService.updateByAdminInTx(
                        tx,
                        id,
                        {
                            description: body.description,
                            type: body.type,
                        },
                        { roleId: user.roleId, roleType: user.role.type }
                    );

                    const timestamp = this.helperDateService.create();
                    const metadata = this.roleUtil.mapActivityLogMetadata(
                        role,
                        timestamp
                    );
                    const effect = this.activityLogService.recordEffect(
                        {
                            action: EnumActivityLogAction.adminRoleUpdate,
                            metadata,
                        },
                        context
                    );
                    await this.outboxService.addInTx(tx, effect);

                    return role;
                }
            );

            return { data: updated };
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new RoleNotFoundException();
            }

            throw new AppUnknownException(err);
        }
    }
}
