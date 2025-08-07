import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '@modules/auth/enums/auth.status-code.enum';
import { AuthService } from '@modules/auth/services/auth.service';
import { ConfigService } from '@nestjs/config';
import { IAuthSocialPayload } from '@modules/auth/interfaces/auth.interface';

/**
 * Guard for validating Google social authentication tokens.
 * Implements CanActivate interface to protect routes that require Google authentication.
 */
@Injectable()
export class AuthSocialGoogleGuard implements CanActivate {
    private readonly header: string;
    private readonly prefix: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly authService: AuthService
    ) {
        this.header = this.configService.get<string>('auth.google.header');
        this.prefix = this.configService.get<string>('auth.google.prefix');
    }

    /**
     * Validates Google authentication token and attaches user payload to request.
     * @param context - The execution context containing the HTTP request
     * @returns Promise<boolean> - True if authentication is successful
     * @throws UnauthorizedException - When token is missing, malformed, or invalid
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<IRequestApp<IAuthSocialPayload>>();

        const requestHeader =
            (request.headers[`${this.header?.toLowerCase()}`] as string)?.split(
                `${this.prefix} `
            ) ?? [];

        if (!requestHeader || requestHeader.length !== 2) {
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.SOCIAL_GOOGLE_REQUIRED,
                message: 'auth.error.socialGoogleRequired',
            });
        }

        try {
            const accessToken: string = requestHeader[1];
            const payload: IAuthSocialPayload =
                await this.authService.googleGetTokenInfo(accessToken);

            request.user = payload;

            return true;
        } catch (err: unknown) {
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.SOCIAL_GOOGLE_INVALID,
                message: 'auth.error.socialGoogleInvalid',
                _error: err,
            });
        }
    }
}
