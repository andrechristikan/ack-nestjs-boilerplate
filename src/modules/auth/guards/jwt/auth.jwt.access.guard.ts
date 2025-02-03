import { AuthGuard } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/modules/auth/enums/auth.status-code.enum';
import { AuthJwtAccessPayloadDto } from 'src/modules/auth/dtos/jwt/auth.jwt.access-payload.dto';
import { isUUID } from 'class-validator';

@Injectable()
export class AuthJwtAccessGuard extends AuthGuard('jwtAccess') {
    handleRequest<T = AuthJwtAccessPayloadDto>(
        err: Error,
        user: T,
        info: Error
    ): T {
        if (err || !user) {
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                message: 'auth.error.accessTokenUnauthorized',
                _error: err ? err.message : info.message,
            });
        }

        const { sub } = user as AuthJwtAccessPayloadDto;
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
