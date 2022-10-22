import { AuthGuard } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/common/auth/constants/auth.status-code.constant';

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwtRefresh') {
    handleRequest<TUser = any>(
        err: Record<string, any>,
        user: TUser,
        info: any
    ): TUser {
        if (err || !user) {
            throw new UnauthorizedException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_JWT_REFRESH_TOKEN_ERROR,
                message: 'auth.error.refreshTokenUnauthorized',
                error: err ? err.message : info.message,
            });
        }

        return user;
    }
}
