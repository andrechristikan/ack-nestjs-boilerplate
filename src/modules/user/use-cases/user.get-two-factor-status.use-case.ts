import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { UserTwoFactorStatusResponseDto } from '@modules/user/dtos/response/user.two-factor-status.response.dto';
import { UserService } from '@modules/user/services/user.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@Injectable()
export class UserGetTwoFactorStatusUseCase implements IAppUseCase<
    [IUserContext],
    IResponseReturn<UserTwoFactorStatusResponseDto>
> {
    constructor(private readonly userService: UserService) {}

    async execute(
        userContext: IUserContext
    ): Promise<IResponseReturn<UserTwoFactorStatusResponseDto>> {
        const twoFactor = this.userService.mapTwoFactor(
            userContext.user.twoFactor
        );

        return { data: twoFactor };
    }
}
