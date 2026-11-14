import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { SessionService } from '@modules/session/services/session.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class DeviceRemoveUseCase implements IAppUseCase<
    [IRequestContext, IApiKeyContext, IAuthJwtAccessContext, string],
    IResponseReturn<void>
> {
    constructor(private readonly sessionService: SessionService) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        deviceOwnershipId: string
    ): Promise<IResponseReturn<void>> {
        await this.sessionService.removeDeviceOwnership(
            requestContext,
            apiKeyContext,
            authContext,
            deviceOwnershipId
        );

        return {};
    }
}
