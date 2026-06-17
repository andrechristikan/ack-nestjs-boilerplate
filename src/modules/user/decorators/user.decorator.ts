import { UserGuardIsVerifiedMetaKey, UserStoreKey } from '@modules/user/constants/user.constant';
import { UserGuard } from '@modules/user/guards/user.guard';
import { IUser } from '@modules/user/interfaces/user.interface';
import {
    ExecutionContext,
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';

/**
 * Method decorator that applies user protection with optional verification requirement.
 * Validates user authentication and optionally checks if the user is verified.
 *
 * @param {boolean} isVerified - Whether the user must be verified (default: true)
 * @returns {MethodDecorator} Method decorator function
 */
export function UserProtected(isVerified: boolean = true): MethodDecorator {
    return applyDecorators(
        UseGuards(UserGuard),
        SetMetadata(UserGuardIsVerifiedMetaKey, isVerified)
    );
}

/**
 * Parameter decorator that extracts the current user from the CLS request context.
 *
 * @param {unknown} _ - Unused parameter
 * @param {ExecutionContext} _ctx - The execution context (unused; CLS is accessed statically)
 * @returns {IUser | undefined} The current user object or undefined if not found
 */
export const UserCurrent = createParamDecorator(
    (_: unknown, _ctx: ExecutionContext): IUser | undefined => {
        return ClsServiceManager.getClsService().get<IUser>(UserStoreKey) ?? undefined;
    }
);
