import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IUserDocument } from 'src/modules/user/interfaces/user.interface';

export const GetUser = createParamDecorator(
    (data: string, ctx: ExecutionContext): IUserDocument => {
        const { __user } = ctx.switchToHttp().getRequest();
        return __user;
    }
);
