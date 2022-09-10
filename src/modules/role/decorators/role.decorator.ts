import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRoleDocument } from 'src/modules/role/interfaces/role.interface';

export const GetRole = createParamDecorator(
    (data: string, ctx: ExecutionContext): IRoleDocument => {
        const { __role } = ctx.switchToHttp().getRequest();
        return __role;
    }
);
