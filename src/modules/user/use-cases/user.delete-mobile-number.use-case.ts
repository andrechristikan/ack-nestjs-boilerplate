import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { IUserMobileNumber } from '@modules/user/interfaces/user.interface';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserDeleteMobileNumberUseCase implements IAppUseCase<
    [string, string, IRequestContext],
    IResponseReturn<IUserMobileNumber>
> {
    constructor(
        private readonly userMobileNumberService: UserMobileNumberService
    ) {}

    async execute(
        userId: string,
        mobileNumberId: string,
        context: IRequestContext
    ): Promise<IResponseReturn<IUserMobileNumber>> {
        const mobileNumber =
            await this.userMobileNumberService.deleteMobileNumber(
                userId,
                mobileNumberId,
                context
            );

        return { data: mobileNumber };
    }
}
