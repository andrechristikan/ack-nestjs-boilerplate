import { USER_GUARD_EMAIL_VERIFIED_META_KEY } from '@app/modules/user/constants/user.constant';
import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { UserGuard } from 'src/modules/user/guards/user.guard';

export function UserProtected(
    emailVerified: boolean[] = [true]
): MethodDecorator {
    return applyDecorators(
        UseGuards(UserGuard),
        SetMetadata(USER_GUARD_EMAIL_VERIFIED_META_KEY, emailVerified)
    );
}
