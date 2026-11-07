import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { IUserProfile } from '@modules/user/interfaces/user.interface';
import { UserService } from '@modules/user/services/user.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserGetOneUseCase implements IAppUseCase<
    [string],
    IResponseReturn<IUserProfile>
> {
    constructor(private readonly userService: UserService) {}

    async execute(id: string): Promise<IResponseReturn<IUserProfile>> {
        const user = await this.userService.getOne(id);

        return { data: user };
    }
}
