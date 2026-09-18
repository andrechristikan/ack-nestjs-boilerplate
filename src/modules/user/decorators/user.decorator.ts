import {
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
 * Reads the current user, or one of its fields, that `UserGuard` stored; throws when either is absent.
 * @public
 */
export const UserCurrent = createParamDecorator<
    Extract<keyof IUser, string> | undefined,
    IUser | NonNullable<IUser[Extract<keyof IUser, string>]>
>(
    (
        field: Extract<keyof IUser, string> | undefined
    ): IUser | NonNullable<IUser[Extract<keyof IUser, string>]> => {
        const user = ClsServiceManager.getClsService().get<IUser | undefined>(
            UserStoreKey
        );
        if (user === undefined || user === null) {
            throw new RequestContextMissingException(UserStoreKey);
        }

        if (field === undefined || field === null) {
            return user;
        }

        const value = user[field];
        if (value === undefined || value === null) {
            throw new RequestContextMissingException(
                `${UserStoreKey}.${field}`
            );
        }

        return value;
    }
);
