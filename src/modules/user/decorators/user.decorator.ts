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

/** Applies the user guard; pass `false` to skip the email-verified requirement. */
export function UserProtected(isVerified: boolean = true): MethodDecorator {
    return applyDecorators(
        UseGuards(UserGuard),
        SetMetadata(UserGuardIsVerifiedMetaKey, isVerified)
    );
}

/** Extracts the current user that `UserGuard` stored in the request context. */
export const UserCurrent = createParamDecorator(
    (_: unknown, _ctx: ExecutionContext): IUser | undefined => {
        return ClsServiceManager.getClsService().get<IUser>(UserStoreKey) ?? undefined;
    }
);
