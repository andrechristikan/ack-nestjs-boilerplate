import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/constants/doc.enum.constant';
import {
    Doc,
    DocRequest,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { UserLoginSerialization } from 'src/modules/user/serializations/user.login.serialization';

export function UserPublicLoginDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            operation: 'modules.public.user',
        }),
        DocRequest({ bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON }),
        DocResponse<UserLoginSerialization>('user.login', {
            serialization: UserLoginSerialization,
        })
    );
}

export function UserPublicSignUpDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            operation: 'modules.public.user',
        }),
        DocRequest({ bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON }),
        DocResponse('user.signUp', {
            httpStatus: HttpStatus.CREATED,
        })
    );
}
