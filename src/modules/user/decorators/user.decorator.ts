import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import {
    UserDoc,
    UserEntity,
} from 'src/modules/user/repository/entities/user.entity';

export const GetUser = createParamDecorator(
    (returnPlain: boolean, ctx: ExecutionContext): UserDoc | UserEntity => {
        const { __user } = ctx
            .switchToHttp()
            .getRequest<IRequestApp & { __user: UserDoc }>();
        return returnPlain ? __user.toObject() : __user;
    }
);
