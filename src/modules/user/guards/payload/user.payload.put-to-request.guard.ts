import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { IUserDocument } from 'src/modules/user/interfaces/user.interface';
import { UserService } from 'src/modules/user/services/user.service';

@Injectable()
export class UserPayloadPutToRequestGuard implements CanActivate {
    constructor(private readonly userService: UserService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const { user } = request;

        const check: IUserDocument =
            await this.userService.findOneById<IUserDocument>(user._id, {
                populate: true,
            });
        request.__user = check;

        return true;
    }
}
