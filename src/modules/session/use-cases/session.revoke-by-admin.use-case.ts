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
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        userId: string,
        sessionId: string
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards
        const targetRole = await this.userService.getRoleById(userId);
        this.roleService.assertActorOutranks(
            userContext.user.role.type,
            targetRole.type
        );

        const revokedAt = this.helperDateService.create();
        await this.sessionService.revokeByAdmin(
            requestContext,
            apiKeyContext,
            authContext,
            userId,
            sessionId,
            revokedAt
        );

        return {};
    }
}
