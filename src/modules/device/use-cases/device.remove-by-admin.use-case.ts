import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { RoleService } from '@modules/role/services/role.service';
import { SessionService } from '@modules/session/services/session.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class DeviceRemoveByAdminUseCase implements IAppUseCase<
    [IRequestContextUser, string, string],
    IResponseReturn<void>
> {
    constructor(
        private readonly sessionService: SessionService,
        private readonly roleService: RoleService
    ) {}

    async execute(
        context: IRequestContextUser,
        userId: string,
        deviceOwnershipId: string
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards
        const targetRole = await this.roleService.getOneByUserId(userId);
        this.roleService.assertActorOutranks(
            context.user.role.type,
            targetRole.type
        );

        await this.sessionService.removeDeviceOwnershipByAdmin(
            context.snapshot,
            userId,
            deviceOwnershipId
        );

        return {};
    }
}
