import { AuthGuard } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '@modules/auth/enums/auth.status-code.enum';
import { isUUID } from 'class-validator';
import { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { AuthJwtAccessGuardKey } from '@modules/auth/constants/auth.contant';

@Injectable()
export class AuthJwtAccessGuard extends AuthGuard(AuthJwtAccessGuardKey) {
    handleRequest<T = IAuthJwtAccessTokenPayload>(
        err: Error,
        user: T,
        info: Error
    ): T {
        if (err || !user) {
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                message: 'auth.error.accessTokenUnauthorized',
                _error: err ? err : info,
            });
        }

        const { sub } = user as IAuthJwtAccessTokenPayload;
        if (!sub) {
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                message: 'auth.error.accessTokenUnauthorized',
            });
        } else if (!isUUID(sub)) {
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        return user;
    }
}
