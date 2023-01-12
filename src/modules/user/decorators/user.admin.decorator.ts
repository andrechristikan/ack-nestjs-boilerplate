import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import {
    USER_ACTIVE_META_KEY,
    USER_BLOCKED_META_KEY,
} from 'src/modules/user/constants/user.constant';
import { UserActiveGuard } from 'src/modules/user/guards/user.active.guard';
import { UserBlockedGuard } from 'src/modules/user/guards/user.blocked.guard';
import { UserNotFoundGuard } from 'src/modules/user/guards/user.not-found.guard';
import { UserPutToRequestGuard } from 'src/modules/user/guards/user.put-to-request.guard';

export function UserGetGuard(): MethodDecorator {
    return applyDecorators(UseGuards(UserPutToRequestGuard, UserNotFoundGuard));
}

export function UserDeleteGuard(): MethodDecorator {
    return applyDecorators(
        UseGuards(
            UserPutToRequestGuard,
            UserNotFoundGuard,
            UserActiveGuard,
            UserBlockedGuard
        ),
        SetMetadata(USER_ACTIVE_META_KEY, [false]),
        SetMetadata(USER_BLOCKED_META_KEY, [true])
    );
}

export function UserUpdateGuard(): MethodDecorator {
    return applyDecorators(UseGuards(UserPutToRequestGuard, UserNotFoundGuard));
}

export function UserUpdateInactiveGuard(): MethodDecorator {
    return applyDecorators(
        UseGuards(UserPutToRequestGuard, UserNotFoundGuard, UserActiveGuard),
        SetMetadata(USER_ACTIVE_META_KEY, [true])
    );
}

export function UserUpdateActiveGuard(): MethodDecorator {
    return applyDecorators(
        UseGuards(UserPutToRequestGuard, UserNotFoundGuard, UserActiveGuard),
        SetMetadata(USER_ACTIVE_META_KEY, [false])
    );
}

export function UserUpdateBlockedGuard(): MethodDecorator {
    return applyDecorators(
        UseGuards(UserPutToRequestGuard, UserNotFoundGuard, UserBlockedGuard),
        SetMetadata(USER_BLOCKED_META_KEY, [false])
    );
}
