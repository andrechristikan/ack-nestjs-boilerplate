import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { RoleService } from '@modules/role/services/role.service';
import { SessionService } from '@modules/session/services/session.service';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class DeviceRemoveByAdminUseCase implements IAppUseCase<
    [string, string, IUser, IRequestContext],
    IResponseReturn<void>
> {
    constructor(
        private readonly sessionService: SessionService,
        private readonly roleService: RoleService
    ) {}

    async execute(
        userId: string,
        deviceOwnershipId: string,
        user: IUser,
        context: IRequestContext
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards
        const targetRole = await this.roleService.getOneByUserId(userId);
        this.roleService.assertActorOutranks(user.role.type, targetRole.type);

        await this.sessionService.removeDeviceOwnershipByAdmin(
            userId,
            deviceOwnershipId,
            user.id,
            context
        );

        return {};
    }
}
