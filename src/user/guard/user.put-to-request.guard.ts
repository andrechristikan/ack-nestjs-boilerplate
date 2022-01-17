import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { IUserDocument } from '../user.interface';
import { UserService } from '../user.service';

@Injectable()
export class UserPutToRequestGuard implements CanActivate {
    constructor(private readonly userService: UserService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const { params } = request;
        const { user } = params;

        const check: IUserDocument =
            await this.userService.findOneById<IUserDocument>(user, {
                populate: {
                    role: true,
                    permission: true,
                },
            });
        request.__user = check;

        return true;
    }
}
