import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import type { RoleDto } from '@modules/role/dtos/role.dto';
import { RoleExistException } from '@modules/role/exceptions/role.exist.exception';
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
        RoleCreateRequestDto,
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
        body: RoleCreateRequestDto
    ): Promise<IResponseReturn<RoleDto>> {
        this.roleService.assertActorOutranks(
            userContext.user.role.type,
            body.type
        );

        const roleId = this.databaseUtil.createId();
        try {
            const created = await this.databaseService.withTransaction(
                async tx => {
                    const role = await this.roleService.createByAdminInTx(
                        tx,
                        roleId,
                        {
                            name: body.name,
                            description: body.description ?? null,
                            type: body.type,
                        }
                    );

                    const timestamp = this.helperDateService.now();
                    const metadata = this.roleUtil.mapActivityLogMetadata(
                        {
                            id: roleId,
                            name: body.name,
                            type: body.type,
                            isImmutable: false,
                        },
                        timestamp
                    );
                    const effect = this.activityLogQueue.recordEffect(
                        requestContext,
                        apiKeyContext,
                        authContext,
                        null,
                        {
                            action: EnumActivityLogAction.adminRoleCreated,
                            metadata,
                        }
                    );
                    await this.outboxService.addInTx(tx, effect);

                    return role;
                }
            );

            return { data: created };
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const isNameCollision = this.databaseUtil.isUniqueCollision(
                err,
                'name'
            );
            if (isNameCollision) {
                throw new RoleExistException();
            }

            throw new AppUnknownException(err);
        }
    }
}
