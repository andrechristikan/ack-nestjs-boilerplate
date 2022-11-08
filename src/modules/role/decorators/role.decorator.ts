import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRole } from 'src/modules/role/interfaces/role.interface';

export const GetRole = createParamDecorator(
    (data: string, ctx: ExecutionContext): IRole => {
        const { __role } = ctx.switchToHttp().getRequest();
        return __role;
    }
);
