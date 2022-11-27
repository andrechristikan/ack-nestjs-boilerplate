import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { USER_ACTIVE_META_KEY } from 'src/modules/user/constants/user.constant';
import { UserActiveGuard } from 'src/modules/user/guards/user.active.guard';
import { UserNotFoundGuard } from 'src/modules/user/guards/user.not-found.guard';
import { UserPutToRequestGuard } from 'src/modules/user/guards/user.put-to-request.guard';

export function UserGetGuard(): MethodDecorator {
    return applyDecorators(UseGuards(UserPutToRequestGuard, UserNotFoundGuard));
}

export function UserDeleteGuard(): MethodDecorator {
    return applyDecorators(UseGuards(UserPutToRequestGuard, UserNotFoundGuard));
}

export function UserUpdateGuard(): MethodDecorator {
    return applyDecorators(UseGuards(UserPutToRequestGuard, UserNotFoundGuard));
}
