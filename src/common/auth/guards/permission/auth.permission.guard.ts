import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/common/auth/constants/auth.status-code.constant';
import { AuthService } from 'src/common/auth/services/auth.service';

@Injectable()
export class AuthPermissionGuard implements CanActivate {
    private readonly headerName: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly authService: AuthService
    ) {
        this.headerName = this.configService.get<string>(
            'auth.permissionToken.headerName'
        );
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const { user } = request;
        const { [this.headerName]: token } = request.headers;

        if (!token) {
            throw new UnauthorizedException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PERMISSION_TOKEN_ERROR,
                message: 'auth.error.permissionTokenUnauthorized',
            });
        }

        const validate: boolean =
            await this.authService.validatePermissionToken(token);
        if (!validate) {
            throw new UnauthorizedException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PERMISSION_TOKEN_INVALID_ERROR,
                message: 'auth.error.permissionTokenInvalid',
            });
        }

        const { data } = await this.authService.payloadPermissionToken(token);

        const payloadEncryption = await this.authService.getPayloadEncryption();
        let payloadDecryptPermissionToken: Record<string, any> = data;

        if (payloadEncryption) {
            payloadDecryptPermissionToken =
                await this.authService.decryptPermissionToken(data);
        }

        if (payloadDecryptPermissionToken._id !== user._id) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PERMISSION_TOKEN_NOT_YOUR_ERROR,
                message: 'auth.error.permissionTokenNotYour',
            });
        }
        request.permissions = payloadDecryptPermissionToken.permissions;

        return true;
    }
}
