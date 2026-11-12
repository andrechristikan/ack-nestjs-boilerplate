import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { CountryService } from '@modules/country/services/country.service';
import type { UserAddMobileNumberRequestDto } from '@modules/user/dtos/request/user.add-mobile-number.request.dto';
import type { IUserMobileNumber } from '@modules/user/interfaces/user.interface';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserAddMobileNumberUseCase implements IAppUseCase<
    [IRequestContextUser, UserAddMobileNumberRequestDto],
    IResponseReturn<IUserMobileNumber>
> {
    constructor(
        private readonly userMobileNumberService: UserMobileNumberService,
        private readonly countryService: CountryService
    ) {}

    async execute(
        context: IRequestContextUser,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto
    ): Promise<IResponseReturn<IUserMobileNumber>> {
        const [country, isDuplicate] = await Promise.all([
            this.countryService.getOne(countryId),
            this.userMobileNumberService.existsMobileNumber(
                context.user.id,
                { number, countryId, phoneCode },
                null
            ),
        ]);
        const mobileNumber = await this.userMobileNumberService.addMobileNumber(
            context.snapshot,
            {
                number,
                countryId,
                phoneCode,
            },
            country.phoneCode,
            isDuplicate
        );

        return { data: mobileNumber };
    }
}
