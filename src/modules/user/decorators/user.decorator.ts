import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IUser } from 'src/modules/user/interfaces/user.interface';

export const GetUser = createParamDecorator(
    (data: string, ctx: ExecutionContext): IUser => {
        const { __user } = ctx.switchToHttp().getRequest();
        return __user;
    }
);
