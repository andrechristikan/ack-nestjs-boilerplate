import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ConfigService } from '@nestjs/config';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from '@modules/api-key/enums/api-key.status-code.enum';
import { ApiKeyEntity } from '@modules/api-key/repository/entities/api-key.entity';
import { HelperService } from '@common/helper/services/helper.service';

@Injectable()
export class ApiKeyXApiKeyGuard implements CanActivate {
    private readonly header: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly apiKeyService: ApiKeyService,
        private readonly helperService: HelperService
    ) {
        this.header = this.configService.get<string>('auth.xApiKey.header');
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<IRequestApp>();
        const xApiKey: string = request.headers[
            `${this.header.toLowerCase()}`
        ] as string;
        if (!xApiKey) {
            throw new UnauthorizedException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_REQUIRED,
                message: 'apiKey.error.xApiKey.required',
            });
        }

        const xApiKeyArr: string[] = xApiKey.split(':');
        if (xApiKeyArr.length !== 2) {
            throw new UnauthorizedException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_INVALID,
                message: 'apiKey.error.xApiKey.invalid',
            });
        }

        const [key, secret] = xApiKeyArr;
        const today = this.helperService.dateCreate();
        const apiKey: ApiKeyEntity =
            await this.apiKeyService.findOneActiveByKeyAndCache(key);

        if (!apiKey) {
            throw new ForbiddenException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_NOT_FOUND,
                message: 'apiKey.error.xApiKey.notFound',
            });
        } else if (!apiKey.isActive) {
            throw new ForbiddenException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_INACTIVE,
                message: 'apiKey.error.xApiKey.inactive',
            });
        } else if (apiKey.startDate && apiKey.endDate) {
            if (today > apiKey.endDate) {
                throw new ForbiddenException({
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_EXPIRED,
                    message: 'apiKey.error.xApiKey.expired',
                });
            } else if (today < apiKey.startDate) {
                throw new ForbiddenException({
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_INACTIVE,
                    message: 'apiKey.error.xApiKey.inactive',
                });
            }
        }

        const validateApiKey: boolean = await this.apiKeyService.validateApiKey(
            key,
            secret,
            apiKey
        );
        if (!validateApiKey) {
            throw new UnauthorizedException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_INVALID,
                message: 'apiKey.error.xApiKey.invalid',
            });
        }

        request.__apiKey = apiKey;

        return true;
    }
}
