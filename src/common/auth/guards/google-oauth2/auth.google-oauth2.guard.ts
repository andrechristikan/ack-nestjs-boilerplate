import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/common/auth/constants/auth.status-code.constant';
import { AuthGooglePayloadSerialization } from 'src/common/auth/serializations/auth.google-payload.serialization';
import { AuthService } from 'src/common/auth/services/auth.service';
import {
    IGooglePayload,
    IGoogleRefresh,
} from 'src/common/helper/interfaces/helper.interface';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

@Injectable()
export class AuthGoogleOauth2Guard implements CanActivate {
    constructor(private readonly authService: AuthService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<
                IRequestApp & { user: AuthGooglePayloadSerialization }
            >();
        const { authorization } = request.headers;
        const acArr = authorization.split('Bearer ');
        if (acArr.length !== 2) {
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GOOGLE_SSO_ERROR,
                message: 'auth.error.googleSSO',
            });
        }

        const refreshToken: string = acArr[1];

        try {
            const accessToken: IGoogleRefresh =
                await this.authService.googleRefreshToken(refreshToken);
            const payload: IGooglePayload =
                await this.authService.googleGetTokenInfo(
                    accessToken.accessToken
                );

            request.user = {
                email: payload.email,
                accessToken: accessToken.accessToken,
                refreshToken: refreshToken,
            };

            return true;
        } catch (err: any) {
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GOOGLE_SSO_ERROR,
                message: 'auth.error.googleSSO',
            });
        }
    }
}
