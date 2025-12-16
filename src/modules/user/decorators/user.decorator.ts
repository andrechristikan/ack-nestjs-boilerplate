import { IRequestApp } from '@common/request/interfaces/request.interface';
import { UserGuardIsVerifiedMetaKey } from '@modules/user/constants/user.constant';
import { UserGuard } from '@modules/user/guards/user.guard';
import { IUser } from '@modules/user/interfaces/user.interface';
import {
    ExecutionContext,
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';

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
 * Parameter decorator that extracts the current user from the request context.
 *
 * @param {unknown} _ - Unused parameter
 * @param {ExecutionContext} ctx - The execution context containing request information
 * @returns {IUser | undefined} The current user object or undefined if not found
 */
export const UserCurrent = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): IUser | undefined => {
        const { __user } = ctx.switchToHttp().getRequest<IRequestApp>();
        return __user;
    }
);
