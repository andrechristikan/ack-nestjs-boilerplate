import {
    UserGuardIsVerifiedMetaKey,
    UserStoreKey,
} from '@modules/user/constants/user.constant';
import { UserGuard } from '@modules/user/guards/user.guard';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { RequestStore } from '@common/request/decorators/request.decorator';

/**
 * Applies the user guard; pass `false` to skip the email-verified requirement.
 * @public
 */
export function UserProtected(isVerified: boolean = true): MethodDecorator {
    return applyDecorators(
        UseGuards(UserGuard),
        SetMetadata(UserGuardIsVerifiedMetaKey, isVerified)
    );
}

/**
 * Reads the current user, or one of its fields, that `UserGuard` stored.
 * @public
 */
export function UserCurrent<K extends Extract<keyof IUser, string>>(
    field?: K
): ParameterDecorator {
    return RequestStore(UserStoreKey, field);
}
