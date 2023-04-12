import {
    Injectable,
    CanActivate,
    ExecutionContext,
    NotFoundException,
} from '@nestjs/common';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';

@Injectable()
export class UserCanNotOurSelfGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { __user, user } = context
            .switchToHttp()
            .getRequest<IRequestApp & { __user: UserDoc }>();

        if (__user._id === user._id) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR,
                message: 'user.error.notFound',
            });
        }

        return true;
    }
}
