import {
    UserGuardIsVerifiedMetaKey,
    UserProtectedDocErrors,
    UserStoreKey,
} from '@modules/user/constants/user.constant';
import { UserGuard } from '@modules/user/guards/user.guard';
import type {
    IUser,
    IUserField,
    IUserFieldValue,
} from '@modules/user/interfaces/user.interface';
import {
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { DocErrors } from '@common/doc/decorators/doc.decorator';
import { UserGuardMissingException } from '@modules/user/exceptions/user.guard-missing.exception';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';

/** @public */
export function UserProtected(isVerified: boolean = true): MethodDecorator {
    return applyDecorators(
        UseGuards(UserGuard),
        SetMetadata(UserGuardIsVerifiedMetaKey, isVerified),
        DocErrors(...UserProtectedDocErrors)
    );
}

/** @public */
export const UserCurrent = createParamDecorator<
    IUserField | undefined,
    IUser | IUserFieldValue
>((field: IUserField | undefined): IUser | IUserFieldValue => {
    const user =
        ClsServiceManager.getClsService().get<IUser | null>(UserStoreKey) ??
        null;
    if (user === null) {
        throw new UserGuardMissingException();
    }

    const fieldKey = field ?? null;
    if (fieldKey === null) {
        return user;
    }

    const value = user[fieldKey] ?? null;
    if (value === null) {
        throw new RequestContextMissingException(`${UserStoreKey}.${fieldKey}`);
    }

    return value;
});
