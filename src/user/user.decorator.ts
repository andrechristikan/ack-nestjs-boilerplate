import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    UseGuards
} from '@nestjs/common';
import { IAuthApplyDecorator } from 'src/auth/auth.interface';
import { UserPayloadPutToRequestGuard } from './guard/payload/user.payload.put-to-request.guard';
import { UserNotFoundGuard } from './guard/user.not-found.guard';
import { UserPutToRequestGuard } from './guard/user.put-to-request.guard';

export const GetUser = createParamDecorator(
    (data: string, ctx: ExecutionContext) => {
        const { __user } = ctx.switchToHttp().getRequest();
        return __user;
    }
);

export function UserGetGuard(): IAuthApplyDecorator {
    return applyDecorators(UseGuards(UserPutToRequestGuard, UserNotFoundGuard));
}

export function UserProfileGuard(): IAuthApplyDecorator {
    return applyDecorators(
        UseGuards(UserPayloadPutToRequestGuard, UserNotFoundGuard)
    );
}
