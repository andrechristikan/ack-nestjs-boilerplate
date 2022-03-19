import {
    Injectable,
    CanActivate,
    ExecutionContext,
    BadRequestException,
} from '@nestjs/common';
import { ENUM_ROLE_STATUS_CODE_ERROR } from '../role.constant';
import { Types } from 'mongoose';
import { UserService } from 'src/user/user.service';
import { UserDocument } from 'src/user/user.schema';
import { DebuggerService } from 'src/debugger/debugger.service';

@Injectable()
export class RoleUsedGuard implements CanActivate {
    constructor(
        private readonly debuggerService: DebuggerService,
        private readonly userService: UserService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { __role } = context.switchToHttp().getRequest();
        const check: UserDocument = await this.userService.findOne({
            role: new Types.ObjectId(__role._id),
        });

        if (check) {
            this.debuggerService.error('Role used', 'RoleUsedGuard', 'delete');
            throw new BadRequestException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_USED_ERROR,
                message: 'role.error.used',
            });
        }
        return true;
    }
}
