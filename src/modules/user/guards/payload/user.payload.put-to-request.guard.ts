import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { IUser } from 'src/modules/user/interfaces/user.interface';
import { UserService } from 'src/modules/user/services/user.service';

@Injectable()
export class UserPayloadPutToRequestGuard implements CanActivate {
    constructor(private readonly userService: UserService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const { user } = request;

        const check: IUser = await this.userService.findOneById<IUser>(
            user._id,
            {
                populate: true,
            }
        );
        request.__user = check;

        return true;
    }
}
