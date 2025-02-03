import { AuthGuard } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/modules/auth/enums/auth.status-code.enum';
import { AuthJwtRefreshPayloadDto } from 'src/modules/auth/dtos/jwt/auth.jwt.refresh-payload.dto';
import { AuthJwtAccessPayloadDto } from 'src/modules/auth/dtos/jwt/auth.jwt.access-payload.dto';
import { isUUID } from 'class-validator';

@Injectable()
export class AuthJwtRefreshGuard extends AuthGuard('jwtRefresh') {
    handleRequest<T = AuthJwtRefreshPayloadDto>(
        err: Error,
        user: T,
        info: Error
    ): T {
        if (err || !user) {
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_REFRESH_TOKEN,
                message: 'auth.error.refreshTokenUnauthorized',
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
