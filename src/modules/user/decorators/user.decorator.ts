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
import { hasRequestGuard } from '@common/request/decorators/request.decorator';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { RequestGuardMissingException } from '@common/request/exceptions/request.guard-missing.exception';
import { RequestProtectedGuardMissingException } from '@common/request/exceptions/request.protected-guard-missing.exception';
import { AuthJwtAccessGuard } from '@modules/auth/guards/jwt/auth.jwt.access.guard';
import { AuthJwtRefreshGuard } from '@modules/auth/guards/jwt/auth.jwt.refresh.guard';

/**
 * Applies the user guard; pass `false` to skip the email-verified requirement.
 * Throws at decoration when neither JWT guard is applied below it.
 * Documents user kits without `auth.error.accessTokenUnauthorized`.
 * @public
 */
export function UserProtected(isVerified: boolean = true): MethodDecorator {
    const decorators = applyDecorators(
        UseGuards(UserGuard),
        SetMetadata(UserGuardIsVerifiedMetaKey, isVerified),
        DocUserErrorResponses.unauthorized,
        DocUserErrorResponses.forbidden
    );

    return (target, propertyKey, descriptor): void => {
        const hasAccess = hasRequestGuard(descriptor, AuthJwtAccessGuard);
        const hasRefresh = hasRequestGuard(descriptor, AuthJwtRefreshGuard);
        if (!hasAccess && !hasRefresh) {
            throw new RequestProtectedGuardMissingException(
                'UserProtected',
                `${AuthJwtAccessGuard.name} or ${AuthJwtRefreshGuard.name}`
            );
        }

        decorators(target, propertyKey, descriptor);
    };
}

/**
 * Reads the current user, or one of its fields, that `UserGuard` stored. Throws `RequestGuardMissingException` when the user is absent and `RequestContextMissingException` when the requested field is null.
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
            throw new RequestGuardMissingException(UserStoreKey);
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
