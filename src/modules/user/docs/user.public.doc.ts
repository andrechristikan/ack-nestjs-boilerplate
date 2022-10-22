import { applyDecorators, HttpStatus } from '@nestjs/common';
import { Doc } from 'src/common/doc/decorators/doc.decorator';

export function UserSignUpDoc(): any {
    return applyDecorators(
        Doc('user.signUp', {
            auth: {
                jwtAccessToken: false,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            response: {
                httpStatus: HttpStatus.CREATED,
            },
        })
    );
}
