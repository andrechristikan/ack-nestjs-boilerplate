import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/common/auth/constants/auth.status-code.constant';
import { AuthApplePayloadSerialization } from 'src/common/auth/serializations/auth.apple-payload.serialization';
import { AuthService } from 'src/common/auth/services/auth.service';
import { IHelperApplePayload } from 'src/common/helper/interfaces/helper.interface';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

@Injectable()
export class AuthAppleOauth2Guard implements CanActivate {
    constructor(private readonly authService: AuthService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<IRequestApp<AuthApplePayloadSerialization>>();
        const { authorization } = request.headers;
        const acArr = authorization.split('Bearer ');

        if (acArr.length !== 2) {
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GOOGLE_SSO_ERROR,
                message: 'auth.error.appleSSO',
            });
        }

        const accessToken: string = acArr[1];

        try {
            const payload: IHelperApplePayload =
                await this.authService.appleGetTokenInfo(accessToken);

            request.user = {
                user: {
                    email: payload.email,
                },
            };

            return true;
        } catch (err: any) {
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.AUTH_APPLE_SSO_ERROR,
                message: 'auth.error.appleSSO',
            });
        }
    }
}
