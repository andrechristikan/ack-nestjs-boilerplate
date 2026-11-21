import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import type { RoleDto } from '@modules/role/dtos/role.dto';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleService } from '@modules/role/services/role.service';
import { RoleUtil } from '@modules/role/utils/role.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@Injectable()
export class RoleUpdateByAdminUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        string,
        RoleUpdateRequestDto,
    ],
    IResponseReturn<RoleDto>
> {
    constructor(
        private readonly roleService: RoleService,
        private readonly roleUtil: RoleUtil,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        id: string,
        body: RoleUpdateRequestDto
    ): Promise<IResponseReturn<RoleDto>> {
        try {
            const updated = await this.databaseService.withTransaction(
                async tx => {
                    const role = await this.roleService.updateByAdminInTx(
                        tx,
                        id,
                        {
                            description: body.description,
                            type: body.type,
                        },
                        {
                            roleId: userContext.user.roleId,
                            roleType: userContext.user.role.type,
                        }
                    );

                    const timestamp = this.helperDateService.create();
                    const metadata = this.roleUtil.mapActivityLogMetadata(
                        role,
                        timestamp
                    );
                    const effect = this.activityLogQueue.recordEffect(
                        requestContext,
                        apiKeyContext,
                        authContext,
                        null,
                        {
                            action: EnumActivityLogAction.adminRoleUpdate,
                            metadata,
                        }
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
