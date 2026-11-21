import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { CountryService } from '@modules/country/services/country.service';
import type {
    IUserContext,
    IUserProfile,
} from '@modules/user/interfaces/user.interface';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserGetProfileUseCase implements IAppUseCase<
    [IUserContext],
    IResponseReturn<IUserProfile>
> {
    constructor(
        private readonly countryService: CountryService,
        private readonly userMobileNumberService: UserMobileNumberService
    ) {}

    async execute({
        user,
    }: IUserContext): Promise<IResponseReturn<IUserProfile>> {
        const [country, mobileNumbers] = await Promise.all([
            this.countryService.getOne(user.countryId),
            this.userMobileNumberService.getListByUser(user.id),
        ]);

        return { data: { ...user, country, mobileNumbers } };
    }
}
