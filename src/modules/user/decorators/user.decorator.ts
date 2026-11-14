import {
    UserContextStoreKey,
    UserGuardIsVerifiedMetaKey,
    UserProtectedDocErrors,
} from '@modules/user/constants/user.constant';
import { UserGuard } from '@modules/user/guards/user.guard';
import {
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { DocErrors } from '@common/doc/decorators/doc.decorator';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

/** @public */
export const UserContext = createParamDecorator((): IUserContext => {
    const userContext =
        ClsServiceManager.getClsService().get<IUserContext | null>(
            UserContextStoreKey
        ) ?? null;
    if (userContext === null) {
        throw new RequestContextMissingException(UserContextStoreKey);
    }

    return userContext;
});

/** @public */
export function UserProtected(isVerified: boolean = true): MethodDecorator {
    return applyDecorators(
        UseGuards(UserGuard),
        SetMetadata(UserGuardIsVerifiedMetaKey, isVerified),
        DocErrors(...UserProtectedDocErrors)
    );
}
