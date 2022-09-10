import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/common/auth/constants/auth.status-code.constant';
import { AuthApiService } from 'src/common/auth/services/auth.api.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

@Injectable()
export class BasicGuard implements CanActivate {
    private readonly clientId: string;
    private readonly clientSecret: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly authApiService: AuthApiService
    ) {
        this.clientId = this.configService.get<string>(
            'auth.basicToken.clientId'
        );
        this.clientSecret = this.configService.get<string>(
            'auth.basicToken.clientSecret'
        );
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request: IRequestApp = context.switchToHttp().getRequest();
        const authorization: string = request.headers.authorization;

        if (!authorization) {
            throw new UnauthorizedException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_BASIC_TOKEN_NEEDED_ERROR,
                message: 'http.clientError.unauthorized',
            });
        }

        const clientBasicToken: string = authorization.replace('Basic ', '');
        const ourBasicToken: string =
            await this.authApiService.createBasicToken(
                this.clientId,
                this.clientSecret
            );

        const validateBasicToken: boolean =
            await this.authApiService.validateBasicToken(
                clientBasicToken,
                ourBasicToken
            );

        if (!validateBasicToken) {
            throw new UnauthorizedException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_BASIC_TOKEN_INVALID_ERROR,
                message: 'http.clientError.unauthorized',
            });
        }

        return true;
    }
}
