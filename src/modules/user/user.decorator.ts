import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    SetMetadata,
    UseGuards,
} from '@nestjs/common';
import { USER_ACTIVE_META_KEY } from './constants/user.constant';
import { UserPayloadPutToRequestGuard } from './guards/payload/user.payload.put-to-request.guard';
import { UserActiveGuard } from './guards/user.active.guard';
import { UserNotFoundGuard } from './guards/user.not-found.guard';
import { UserPutToRequestGuard } from './guards/user.put-to-request.guard';

export const GetUser = createParamDecorator(
    (data: string, ctx: ExecutionContext) => {
        const { __user } = ctx.switchToHttp().getRequest();
        return __user;
    }
);

// admin
export function UserGetGuard(): any {
    return applyDecorators(UseGuards(UserPutToRequestGuard, UserNotFoundGuard));
}

export function UserDeleteGuard(): any {
    return applyDecorators(UseGuards(UserPutToRequestGuard, UserNotFoundGuard));
}

export function UserUpdateGuard(): any {
    return applyDecorators(UseGuards(UserPutToRequestGuard, UserNotFoundGuard));
}

export function UserUpdateInactiveGuard(): any {
    return applyDecorators(
        UseGuards(UserPutToRequestGuard, UserNotFoundGuard, UserActiveGuard),
        SetMetadata(USER_ACTIVE_META_KEY, [true])
    );
}

export function UserUpdateActiveGuard(): any {
    return applyDecorators(
        UseGuards(UserPutToRequestGuard, UserNotFoundGuard, UserActiveGuard),
        SetMetadata(USER_ACTIVE_META_KEY, [false])
    );
}

// public
export function UserProfileGuard(): any {
    return applyDecorators(
        UseGuards(UserPayloadPutToRequestGuard, UserNotFoundGuard)
    );
}
