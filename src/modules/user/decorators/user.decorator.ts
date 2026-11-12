import {
    UserGuardIsVerifiedMetaKey,
    UserProtectedDocErrors,
} from '@modules/user/constants/user.constant';
import { UserGuard } from '@modules/user/guards/user.guard';
import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { DocErrors } from '@common/doc/decorators/doc.decorator';

/** @public */
export function UserProtected(isVerified: boolean = true): MethodDecorator {
    return applyDecorators(
        UseGuards(UserGuard),
        SetMetadata(UserGuardIsVerifiedMetaKey, isVerified),
        DocErrors(...UserProtectedDocErrors)
    );
}
