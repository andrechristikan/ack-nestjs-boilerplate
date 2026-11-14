import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { CountryService } from '@modules/country/services/country.service';
import type { UserAddMobileNumberRequestDto } from '@modules/user/dtos/request/user.add-mobile-number.request.dto';
import type { IUserMobileNumber } from '@modules/user/interfaces/user.interface';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class UserUpdateMobileNumberUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        string,
        UserAddMobileNumberRequestDto,
    ],
    IResponseReturn<IUserMobileNumber>
> {
    constructor(
        private readonly userMobileNumberService: UserMobileNumberService,
        private readonly countryService: CountryService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        mobileNumberId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto
    ): Promise<IResponseReturn<IUserMobileNumber>> {
        const current = await this.userMobileNumberService.getOneMobileNumber(
            authContext.userId,
            mobileNumberId
        );
        const [country, isDuplicate] = await Promise.all([
            this.countryService.getOne(countryId),
            this.userMobileNumberService.existsMobileNumber(
                authContext.userId,
                { number, countryId, phoneCode },
                current.id
            ),
        ]);
        const mobileNumber =
            await this.userMobileNumberService.updateMobileNumber(
                requestContext,
                apiKeyContext,
                authContext,
                current,
                { number, countryId, phoneCode },
                country.phoneCode,
                isDuplicate
            );

        return { data: mobileNumber };
    }
}
