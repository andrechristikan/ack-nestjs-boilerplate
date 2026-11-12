import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { RoleService } from '@modules/role/services/role.service';
import { SessionService } from '@modules/session/services/session.service';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class SessionRevokeByAdminUseCase implements IAppUseCase<
    [string, string, IUser, IRequestContext],
    IResponseReturn<void>
> {
    constructor(
        private readonly sessionService: SessionService,
        private readonly roleService: RoleService,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(
        userId: string,
        sessionId: string,
        user: IUser,
        context: IRequestContext
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards
        const targetRole = await this.roleService.getOneByUserId(userId);
        this.roleService.assertActorOutranks(user.role.type, targetRole.type);

        const revokedAt = this.helperDateService.create();
        await this.sessionService.revokeByAdmin(
            userId,
            sessionId,
            user.id,
            revokedAt,
            context
        );

        return {};
    }
}
