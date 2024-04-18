import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/common/auth/constants/auth.status-code.constant';
import { AuthSocialGooglePayloadDto } from 'src/common/auth/dtos/social/auth.social.google-payload.dto';
import { AuthService } from 'src/common/auth/services/auth.service';
import { IHelperGooglePayload } from 'src/common/helper/interfaces/helper.interface';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

@Injectable()
export class AuthSocialGoogleGuard implements CanActivate {
    constructor(private readonly authService: AuthService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<IRequestApp<AuthSocialGooglePayloadDto>>();
        const { authorization } = request.headers;
        const acArr = authorization.split('Bearer ');
        if (acArr.length !== 2) {
            throw new UnauthorizedException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_SOCIAL_GOOGLE_ERROR,
                message: 'auth.error.socialGoogle',
            });
        }

        const accessToken: string = acArr[1];

        // TODO: Validate Token

        try {
            const payload: IHelperGooglePayload =
                await this.authService.googleGetTokenInfo(accessToken);

            request.user = {
                email: payload.email,
            };

            return true;
        } catch (err: any) {
            throw new UnauthorizedException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_SOCIAL_GOOGLE_ERROR,
                message: 'auth.error.socialGoogle',
            });
        }
    }
}
