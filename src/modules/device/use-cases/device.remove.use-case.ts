import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { SessionService } from '@modules/session/services/session.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class DeviceRemoveUseCase implements IAppUseCase<
    [IRequestContextUser, string],
    IResponseReturn<void>
> {
    constructor(private readonly sessionService: SessionService) {}

    async execute(
        context: IRequestContextUser,
        deviceOwnershipId: string
    ): Promise<IResponseReturn<void>> {
        await this.sessionService.removeDeviceOwnership(
            context.snapshot,
            deviceOwnershipId
        );

        return {};
    }
}
