import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { UserCheckEmailRequestDto } from '@modules/user/dtos/request/user.check-email.request.dto';
import type { IUserCheckEmail } from '@modules/user/interfaces/user.interface';
import { UserService } from '@modules/user/services/user.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserCheckEmailUseCase implements IAppUseCase<
    [UserCheckEmailRequestDto],
    IResponseReturn<IUserCheckEmail>
> {
    constructor(private readonly userService: UserService) {}

    async execute({
        email,
    }: UserCheckEmailRequestDto): Promise<IResponseReturn<IUserCheckEmail>> {
        const checkEmail = await this.userService.checkEmail(email);

        return { data: checkEmail };
    }
}
