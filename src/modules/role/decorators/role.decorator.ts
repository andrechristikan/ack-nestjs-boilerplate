import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRoleEntity } from 'src/modules/role/interfaces/role.interface';

export const GetRole = createParamDecorator(
    (data: string, ctx: ExecutionContext): IRoleEntity => {
        const { __role } = ctx.switchToHttp().getRequest();
        return __role;
    }
);
