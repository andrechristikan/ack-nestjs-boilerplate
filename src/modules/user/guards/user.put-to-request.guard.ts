import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { IUserEntity } from 'src/modules/user/interfaces/user.interface';
import { UserService } from 'src/modules/user/services/user.service';

@Injectable()
export class UserPutToRequestGuard implements CanActivate {
    constructor(private readonly userService: UserService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const { params } = request;
        const { user } = params;

        const check: IUserEntity =
            await this.userService.findOneById<IUserEntity>(user, {
                join: true,
            });
        request.__user = check;

        return true;
    }
}
