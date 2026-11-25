import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { RoleService } from '@modules/role/services/role.service';
import { SessionService } from '@modules/session/services/session.service';
import { UserService } from '@modules/user/services/user.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@Injectable()
export class SessionRevokeAllByAdminUseCase implements IAppUseCase<
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
        private readonly sessionService: SessionService,
        private readonly roleService: RoleService,
        private readonly userService: UserService,
        private readonly helperDateService: HelperDateService,
        private readonly databaseService: DatabaseService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        userId: string
    ): Promise<IResponseReturn<void>> {
        this.userService.assertNotSelf(userId, authContext.userId);

        // Sequential by design: a write after its checks
        const target = await this.userService.getOneWithRole(userId);
        this.roleService.assertActorOutranks(
            userContext.user.role.type,
            target.role.type
        );
        this.userService.assertUnblocked(target);

        const revokedAt = this.helperDateService.now();
        await this.databaseService.withTransaction(async tx =>
            this.sessionService.revokeAllByAdminInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                userId,
                revokedAt
            )
        );

        return {};
    }
}
