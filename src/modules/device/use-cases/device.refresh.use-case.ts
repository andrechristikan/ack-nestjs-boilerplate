import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { DeviceRefreshRequestDto } from '@modules/device/dtos/request/device.refresh.request.dto';
import { DeviceService } from '@modules/device/services/device.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class DeviceRefreshUseCase implements IAppUseCase<
    [string, string, DeviceRefreshRequestDto, IRequestContext],
    IResponseReturn<void>
> {
    constructor(private readonly deviceService: DeviceService) {}

    async execute(
        userId: string,
        deviceOwnershipId: string,
        body: DeviceRefreshRequestDto,
        context: IRequestContext
    ): Promise<IResponseReturn<void>> {
        await this.deviceService.refresh(
            userId,
            deviceOwnershipId,
            body,
            context
        );

        return {};
    }
}
