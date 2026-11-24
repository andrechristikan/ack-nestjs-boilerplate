import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { RoleService } from '@modules/role/services/role.service';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import { SessionService } from '@modules/session/services/session.service';
import { UserService } from '@modules/user/services/user.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@Injectable()
export class SessionRevokeByAdminUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        string,
        string,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly sessionService: SessionService,
        private readonly roleService: RoleService,
        private readonly userService: UserService,
        private readonly helperDateService: HelperDateService,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        userId: string,
        sessionId: string
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: a write after its checks
        const target = await this.userService.getOneWithRole(userId);
        this.roleService.assertActorOutranks(
            userContext.user.role.type,
            target.role.type
        );
        this.userService.assertUnblocked(target);

        const revokedAt = this.helperDateService.now();
        try {
            await this.databaseService.withTransaction(async tx =>
                this.sessionService.revokeByAdminInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userId,
                    sessionId,
                    revokedAt
                )
            );
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new SessionNotFoundException();
            }

            throw new AppUnknownException(err);
        }

        return {};
    }
}
