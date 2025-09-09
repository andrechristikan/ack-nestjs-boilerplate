import { USER_GUARD_IS_VERIFIED_META_KEY } from '@modules/user/constants/user.constant';
import { UserGuard } from '@modules/user/guards/user.guard';
import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';

export function UserProtected(isVerified: boolean[] = [true]): MethodDecorator {
    return applyDecorators(
        UseGuards(UserGuard),
        SetMetadata(USER_GUARD_IS_VERIFIED_META_KEY, isVerified)
    );
}
