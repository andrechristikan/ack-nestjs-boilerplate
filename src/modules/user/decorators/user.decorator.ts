import { IRequestApp } from '@common/request/interfaces/request.interface';
import { USER_GUARD_IS_VERIFIED_META_KEY } from '@modules/user/constants/user.constant';
import { UserGuard } from '@modules/user/guards/user.guard';
import { IUser } from '@modules/user/interfaces/user.interface';
import {
    ExecutionContext,
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';

export function UserProtected(isVerified: boolean = true): MethodDecorator {
    return applyDecorators(
        UseGuards(UserGuard),
        SetMetadata(USER_GUARD_IS_VERIFIED_META_KEY, isVerified)
    );
}

export const UserCurrent = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): IUser | undefined => {
        const { __user } = ctx.switchToHttp().getRequest<IRequestApp>();
        return __user;
    }
);
