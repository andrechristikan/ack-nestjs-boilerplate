import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IUserEntity } from 'src/modules/user/interfaces/user.interface';

export const GetUser = createParamDecorator(
    (data: string, ctx: ExecutionContext): IUserEntity => {
        const { __user } = ctx.switchToHttp().getRequest();
        return __user;
    }
);
