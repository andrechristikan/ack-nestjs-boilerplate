import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { UserCheckUsernameRequestDto } from '@modules/user/dtos/request/user.check-username.request.dto';
import type { IUserCheckUsername } from '@modules/user/interfaces/user.interface';
import { UserService } from '@modules/user/services/user.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserCheckUsernameUseCase implements IAppUseCase<
    [UserCheckUsernameRequestDto],
    IResponseReturn<IUserCheckUsername>
> {
    constructor(private readonly userService: UserService) {}

    async execute({
        username,
    }: UserCheckUsernameRequestDto): Promise<
        IResponseReturn<IUserCheckUsername>
    > {
        const checkUsername = await this.userService.checkUsername(username);

        return { data: checkUsername };
    }
}
