import {
    DocUserErrorResponses,
    UserGuardIsVerifiedMetaKey,
    UserStoreKey,
} from '@modules/user/constants/user.constant';
import { UserGuard } from '@modules/user/guards/user.guard';
import type { IUser } from '@modules/user/interfaces/user.interface';
import {
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { UserNotAuthenticatedException } from '@modules/user/exceptions/user.not-authenticated.exception';

/**
 * Applies the user guard; pass `false` to skip the email-verified requirement.
 * Documents user kits without `auth.error.accessTokenUnauthorized`.
 * @public
 */
export function UserProtected(isVerified: boolean = true): MethodDecorator {
    return applyDecorators(
        UseGuards(UserGuard),
        SetMetadata(UserGuardIsVerifiedMetaKey, isVerified),
        DocUserErrorResponses.unauthorized,
        DocUserErrorResponses.forbidden
    );
}

/**
 * Reads the current user, or one of its fields, that `UserGuard` stored. Throws `UserNotAuthenticatedException` when the user is absent and `RequestContextMissingException` when the requested field is null.
 * @public
 */
export const UserCurrent = createParamDecorator<
    Extract<keyof IUser, string> | undefined,
    IUser | NonNullable<IUser[Extract<keyof IUser, string>]>
>(
    (
        field: Extract<keyof IUser, string> | undefined
    ): IUser | NonNullable<IUser[Extract<keyof IUser, string>]> => {
        const user =
            ClsServiceManager.getClsService().get<IUser | null>(UserStoreKey) ??
            null;
        if (user === null) {
            throw new UserNotAuthenticatedException();
        }

        const fieldKey = field ?? null;
        if (fieldKey === null) {
            return user;
        }

        const value = user[fieldKey] ?? null;
        if (value === null) {
            throw new RequestContextMissingException(
                `${UserStoreKey}.${fieldKey}`
            );
        }

        return value;
    }
);
