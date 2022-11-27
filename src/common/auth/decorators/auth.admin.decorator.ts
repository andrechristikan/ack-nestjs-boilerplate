import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { USER_ACTIVE_META_KEY } from 'src/modules/user/constants/user.constant';
import { UserActiveGuard } from 'src/modules/user/guards/user.active.guard';
import { UserNotFoundGuard } from 'src/modules/user/guards/user.not-found.guard';
import { UserPutToRequestGuard } from 'src/modules/user/guards/user.put-to-request.guard';

export function AuthUpdateInactiveGuard(): MethodDecorator {
    return applyDecorators(
        UseGuards(UserPutToRequestGuard, UserNotFoundGuard, UserActiveGuard),
        SetMetadata(USER_ACTIVE_META_KEY, [true])
    );
}

export function AuthUpdateActiveGuard(): MethodDecorator {
    return applyDecorators(
        UseGuards(UserPutToRequestGuard, UserNotFoundGuard, UserActiveGuard),
        SetMetadata(USER_ACTIVE_META_KEY, [false])
    );
}
