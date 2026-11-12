import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { IUserMobileNumber } from '@modules/user/interfaces/user.interface';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserDeleteMobileNumberUseCase implements IAppUseCase<
    [IRequestContextUser, string],
    IResponseReturn<IUserMobileNumber>
> {
    constructor(
        private readonly userMobileNumberService: UserMobileNumberService
    ) {}

    async execute(
        context: IRequestContextUser,
        mobileNumberId: string
    ): Promise<IResponseReturn<IUserMobileNumber>> {
        const mobileNumber =
            await this.userMobileNumberService.deleteMobileNumber(
                context.snapshot,
                mobileNumberId
            );

        return { data: mobileNumber };
    }
}
