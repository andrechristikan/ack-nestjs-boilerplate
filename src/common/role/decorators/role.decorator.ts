import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import {
    RoleDoc,
    RoleEntity,
} from 'src/common/role/repository/entities/role.entity';

export const GetRole = createParamDecorator(
    (returnPlain: boolean, ctx: ExecutionContext): RoleDoc | RoleEntity => {
        const { __role } = ctx
            .switchToHttp()
            .getRequest<IRequestApp & { __role: RoleDoc }>();
        return returnPlain ? __role.toObject() : __role;
    }
);
