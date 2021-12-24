import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    UseGuards
} from '@nestjs/common';
import { UserPayloadPutToRequestGuard } from './guard/payload/user.payload.put-to-request.guard';
import { UserNotFoundGuard } from './guard/user.not-found.guard';
import { UserPutToRequestGuard } from './guard/user.put-to-request.guard';

export const GetUser = createParamDecorator(
    (data: string, ctx: ExecutionContext) => {
        const { __user } = ctx.switchToHttp().getRequest();
        return __user;
    }
);

export function UserGetGuard(): any {
    return applyDecorators(UseGuards(UserPutToRequestGuard, UserNotFoundGuard));
}

export function UserProfileGuard(): any {
    return applyDecorators(
        UseGuards(UserPayloadPutToRequestGuard, UserNotFoundGuard)
    );
}
