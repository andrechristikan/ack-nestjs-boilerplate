import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { IUserMobileNumber } from '@modules/user/interfaces/user.interface';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class UserDeleteMobileNumberUseCase implements IAppUseCase<
    [IRequestContext, IApiKeyContext, IAuthJwtAccessContext, string],
    IResponseReturn<IUserMobileNumber>
> {
    constructor(
        private readonly userMobileNumberService: UserMobileNumberService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        mobileNumberId: string
    ): Promise<IResponseReturn<IUserMobileNumber>> {
        const mobileNumber =
            await this.userMobileNumberService.deleteMobileNumber(
                requestContext,
                apiKeyContext,
                authContext,
                mobileNumberId
            );

        return { data: mobileNumber };
    }
}
