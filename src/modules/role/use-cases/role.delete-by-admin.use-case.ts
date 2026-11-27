import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { RoleService } from '@modules/role/services/role.service';
import { RoleUtil } from '@modules/role/utils/role.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@Injectable()
export class RoleDeleteByAdminUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        string,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly roleService: RoleService,
        private readonly roleUtil: RoleUtil,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        id: string
    ): Promise<IResponseReturn<void>> {
        const target = await this.roleService.getDeletableByActor(
            {
                roleId: userContext.user.roleId,
                roleType: userContext.user.role.type,
            },
            id
        );

        await this.databaseService.withTransaction(async tx => {
            const deleted = await this.roleService.deleteByAdminInTx(
                tx,
                target
            );

            const timestamp = this.helperDateService.now();
            const metadata = this.roleUtil.mapActivityLogMetadata(
                deleted,
                timestamp
            );
            const effect = this.activityLogQueue.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                {
                    action: EnumActivityLogAction.adminRoleDeleted,
                    metadata,
                }
            );
            await this.outboxService.addInTx(tx, effect);
        });

        return {};
    }
}
