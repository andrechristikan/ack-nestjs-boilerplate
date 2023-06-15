import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { UserLoginSerialization } from 'src/modules/user/serializations/user.login.serialization';

export function UserPublicLoginDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocAuth({
            jwtAccessToken: true,
        }),

        DocResponse<UserLoginSerialization>('user.login', {
            serialization: UserLoginSerialization,
        })
    );
}

export function UserPublicSignUpDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocAuth({
            jwtAccessToken: true,
        }),

        DocResponse('user.signUp', {
            httpStatus: HttpStatus.CREATED,
        })
    );
}
