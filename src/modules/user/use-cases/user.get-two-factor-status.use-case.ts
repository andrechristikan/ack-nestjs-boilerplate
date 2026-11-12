import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { UserTwoFactorStatusResponseDto } from '@modules/user/dtos/response/user.two-factor-status.response.dto';
import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import { UserService } from '@modules/user/services/user.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserGetTwoFactorStatusUseCase implements IAppUseCase<
    [IRequestContextUser],
    IResponseReturn<UserTwoFactorStatusResponseDto>
> {
    constructor(private readonly userService: UserService) {}

    async execute(
        context: IRequestContextUser
    ): Promise<IResponseReturn<UserTwoFactorStatusResponseDto>> {
        const twoFactor = this.userService.mapTwoFactor(context.user.twoFactor);

        return { data: twoFactor };
    }
}
