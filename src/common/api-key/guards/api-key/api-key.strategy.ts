import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import Strategy from 'passport-headerapikey';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/common/api-key/constants/api-key.status-code.constant';
import { ApiKeyEntity } from 'src/common/api-key/repository/entities/api-key.entity';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

@Injectable()
export class ApiKeyKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
    constructor(private readonly apiKeyService: ApiKeyService) {
        super(
            { header: 'X-API-KEY', prefix: '' },
            true,
            async (
                apiKey: string,
                verified: (
                    error: Error,
                    user?: Record<string, any>,
                    info?: string | number
                ) => Promise<void>,
                req: IRequestApp
            ) => this.validate(apiKey, verified, req)
        );
    }

    async validate(
        apiKey: string,
        verified: (
            error: Error,
            user?: ApiKeyEntity,
            info?: string | number
        ) => Promise<void>,
        req: IRequestApp
    ): Promise<void> {
        const xApiKey: string[] = apiKey.split(':');
        if (xApiKey.length !== 2) {
            verified(
                new Error(
                    `${ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_INVALID_ERROR}`
                ),
                null,
                null
            );

            return;
        }

        const key = xApiKey[0];
        const hashed = xApiKey[1];
        const authApi: ApiKeyEntity = await this.apiKeyService.findOneByKey(
            key
        );

        if (!authApi) {
            verified(
                new Error(
                    `${ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_NOT_FOUND_ERROR}`
                ),
                null,
                null
            );

            return;
        } else if (!authApi.isActive) {
            verified(
                new Error(
                    `${ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_INACTIVE_ERROR}`
                ),
                null,
                null
            );

            return;
        }

        const validateApiKey: boolean =
            await this.apiKeyService.validateHashApiKey(hashed, authApi.hash);
        if (!validateApiKey) {
            verified(
                new Error(
                    `${ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_INVALID_ERROR}`
                ),
                null,
                null
            );

            return;
        }

        req.apiKey = {
            _id: authApi._id,
            key: authApi.key,
            name: authApi.name,
        };
        verified(null, authApi);

        return;
    }
}
