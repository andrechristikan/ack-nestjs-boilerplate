import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { RoleService } from '@modules/role/services/role.service';
import { SessionService } from '@modules/session/services/session.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class SessionRevokeByAdminUseCase implements IAppUseCase<
    [IRequestContextUser, string, string],
    IResponseReturn<void>
> {
    constructor(
        private readonly sessionService: SessionService,
        private readonly roleService: RoleService,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(
        context: IRequestContextUser,
        userId: string,
        sessionId: string
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards
        const targetRole = await this.roleService.getOneByUserId(userId);
        this.roleService.assertActorOutranks(
            context.user.role.type,
            targetRole.type
        );

        const revokedAt = this.helperDateService.create();
        await this.sessionService.revokeByAdmin(
            context.snapshot,
            userId,
            sessionId,
            revokedAt
        );

        return {};
    }
}
