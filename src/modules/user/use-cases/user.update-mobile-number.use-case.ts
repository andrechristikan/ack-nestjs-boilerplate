import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { CountryService } from '@modules/country/services/country.service';
import type { UserAddMobileNumberRequestDto } from '@modules/user/dtos/request/user.add-mobile-number.request.dto';
import type { IUserMobileNumber } from '@modules/user/interfaces/user.interface';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserUpdateMobileNumberUseCase implements IAppUseCase<
    [IRequestContextUser, string, UserAddMobileNumberRequestDto],
    IResponseReturn<IUserMobileNumber>
> {
    constructor(
        private readonly userMobileNumberService: UserMobileNumberService,
        private readonly countryService: CountryService
    ) {}

    async execute(
        context: IRequestContextUser,
        mobileNumberId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto
    ): Promise<IResponseReturn<IUserMobileNumber>> {
        const current = await this.userMobileNumberService.getOneMobileNumber(
            context.user.id,
            mobileNumberId
        );
        const [country, isDuplicate] = await Promise.all([
            this.countryService.getOne(countryId),
            this.userMobileNumberService.existsMobileNumber(
                context.user.id,
                { number, countryId, phoneCode },
                current.id
            ),
        ]);
        const mobileNumber =
            await this.userMobileNumberService.updateMobileNumber(
                context.snapshot,
                current,
                { number, countryId, phoneCode },
                country.phoneCode,
                isDuplicate
            );

        return { data: mobileNumber };
    }
}
