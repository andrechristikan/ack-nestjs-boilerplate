import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import {
    UserDoc,
    UserEntity,
} from 'src/modules/user/repository/entities/user.entity';

export const GetUser = createParamDecorator(
    (returnPlain: boolean, ctx: ExecutionContext): UserDoc | UserEntity => {
        const { __user } = ctx.switchToHttp().getRequest();
        return returnPlain ? __user.toObject() : __user;
    }
);
