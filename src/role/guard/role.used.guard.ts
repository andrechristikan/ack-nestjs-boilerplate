import {
    Injectable,
    CanActivate,
    ExecutionContext,
    BadRequestException,
} from '@nestjs/common';
import { ENUM_ROLE_STATUS_CODE_ERROR } from '../role.constant';
import { Types } from 'mongoose';
import { UserService } from 'src/user/service/user.service';
import { DebuggerService } from 'src/debugger/service/debugger.service';
import { UserDocument } from 'src/user/schema/user.schema';

@Injectable()
export class RoleUsedGuard implements CanActivate {
    constructor(
        private readonly debuggerService: DebuggerService,
        private readonly userService: UserService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { __role, id } = context.switchToHttp().getRequest();
        const check: UserDocument = await this.userService.findOne({
            role: new Types.ObjectId(__role._id),
        });

        if (check) {
            this.debuggerService.error(id, {
                description: 'Role used',
                class: 'RoleUsedGuard',
                function: 'canActivate',
            });
            throw new BadRequestException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_USED_ERROR,
                message: 'role.error.used',
            });
        }
        return true;
    }
}
