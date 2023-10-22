import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { RoleDoc } from 'src/modules/role/repository/entities/role.entity';

export const GetRole = createParamDecorator(
    <T>(returnPlain: boolean, ctx: ExecutionContext): T => {
        const { __role } = ctx
            .switchToHttp()
            .getRequest<IRequestApp & { __role: RoleDoc }>();
        return (returnPlain ? __role.toObject() : __role) as T;
    }
);
