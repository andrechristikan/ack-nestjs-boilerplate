import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import {
    USER_ACTIVE_META_KEY,
    USER_BLOCKED_META_KEY,
} from 'src/modules/user/constants/user.constant';
import { UserActiveGuard } from 'src/modules/user/guards/user.active.guard';
import { UserBlockedGuard } from 'src/modules/user/guards/user.blocked.guard';
import { UserNotFoundGuard } from 'src/modules/user/guards/user.not-found.guard';
import { UserPutToRequestGuard } from 'src/modules/user/guards/user.put-to-request.guard';

export function UserAdminGetGuard(): MethodDecorator {
    return applyDecorators(UseGuards(UserPutToRequestGuard, UserNotFoundGuard));
}

export function UserAdminDeleteGuard(): MethodDecorator {
    return applyDecorators(UseGuards(UserPutToRequestGuard, UserNotFoundGuard));
}

export function UserAdminUpdateGuard(): MethodDecorator {
    return applyDecorators(UseGuards(UserPutToRequestGuard, UserNotFoundGuard));
}

export function UserAdminUpdateInactiveGuard(): MethodDecorator {
    return applyDecorators(
        UseGuards(UserPutToRequestGuard, UserNotFoundGuard, UserActiveGuard),
        SetMetadata(USER_ACTIVE_META_KEY, [true])
    );
}

export function UserAdminUpdateActiveGuard(): MethodDecorator {
    return applyDecorators(
        UseGuards(UserPutToRequestGuard, UserNotFoundGuard, UserActiveGuard),
        SetMetadata(USER_ACTIVE_META_KEY, [false])
    );
}

export function UserAdminUpdateBlockedGuard(): MethodDecorator {
    return applyDecorators(
        UseGuards(UserPutToRequestGuard, UserNotFoundGuard, UserBlockedGuard),
        SetMetadata(USER_BLOCKED_META_KEY, [false])
    );
}
