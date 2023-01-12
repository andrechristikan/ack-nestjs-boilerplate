import { applyDecorators, HttpStatus } from '@nestjs/common';
import { Doc } from 'src/common/doc/decorators/doc.decorator';

export function UserSignUpDoc(): MethodDecorator {
    return applyDecorators(
        Doc('user.signUp', {
            auth: {
                jwtAccessToken: false,
            },
            response: {
                httpStatus: HttpStatus.CREATED,
            },
        })
    );
}

export function UserDeleteSelfDoc(): MethodDecorator {
    return applyDecorators(
        Doc<void>('user.deleteSelf', {
            auth: {
                jwtAccessToken: true,
            },
        })
    );
}
