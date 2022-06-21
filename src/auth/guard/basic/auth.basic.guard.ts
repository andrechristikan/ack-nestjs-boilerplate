import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/auth/auth.constant';
import { DebuggerService } from 'src/debugger/service/debugger.service';
import { AuthApiService } from 'src/auth/service/auth.api.service';
import { IRequestApp } from 'src/utils/request/request.interface';

@Injectable()
export class BasicGuard implements CanActivate {
    private readonly clientId: string;
    private readonly clientSecret: string;

    constructor(
        private readonly debuggerService: DebuggerService,
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
            this.debuggerService.error(request.id, {
                description: 'AuthBasicGuard Error',
                class: 'BasicGuard',
                function: 'canActivate',
            });

            throw new UnauthorizedException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_BASIC_TOKEN_NEEDED_ERROR,
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
            this.debuggerService.error(request.id, {
                description: 'AuthBasicGuardError Validate Basic Token',
                class: 'BasicGuard',
                function: 'canActivate',
            });

            throw new UnauthorizedException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_BASIC_TOKEN_INVALID_ERROR,
                message: 'http.clientError.unauthorized',
            });
        }

        return true;
    }
}
