import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { UserTwoFactorStatusResponseDto } from '@modules/user/dtos/response/user.two-factor-status.response.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserGetTwoFactorStatusUseCase implements IAppUseCase<
    [IUser],
    IResponseReturn<UserTwoFactorStatusResponseDto>
> {
    constructor(private readonly userUtil: UserUtil) {}

    async execute(
        user: IUser
    ): Promise<IResponseReturn<UserTwoFactorStatusResponseDto>> {
        const twoFactor = this.userUtil.mapTwoFactor(user.twoFactor);

        return { data: twoFactor };
    }
}
