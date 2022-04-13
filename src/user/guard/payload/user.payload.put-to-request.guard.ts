import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { UserService } from 'src/user/service/user.service';
import { IUserDocument } from 'src/user/user.interface';

@Injectable()
export class UserPayloadPutToRequestGuard implements CanActivate {
    constructor(private readonly userService: UserService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const { user } = request;

        const check: IUserDocument =
            await this.userService.findOneById<IUserDocument>(user._id, {
                populate: {
                    role: true,
                    permission: true,
                },
                version: 1,
            });
        request.__user = check;

        return true;
    }
}
