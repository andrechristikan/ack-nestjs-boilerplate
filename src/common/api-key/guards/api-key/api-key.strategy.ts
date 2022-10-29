import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import Strategy from 'passport-headerapikey';
import { IApiKeyRequestHashedData } from 'src/common/api-key/interfaces/api-key.interface';
import { ApiKey } from 'src/common/api-key/schemas/api-key.schema';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/common/auth/constants/auth.status-code.constant';
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
            user?: ApiKey,
            info?: string | number
        ) => Promise<void>,
        req: IRequestApp
    ) {
        const xApiKey: string[] = apiKey.split(':');
        const key = xApiKey[0];
        const encrypted = xApiKey[1];

        const authApi: ApiKey = await this.apiKeyService.findOneByKey(key);

        if (!authApi) {
            verified(
                null,
                null,
                `${ENUM_AUTH_STATUS_CODE_ERROR.AUTH_API_KEY_NOT_FOUND_ERROR}`
            );
        } else if (!authApi.isActive) {
            verified(
                null,
                null,
                `${ENUM_AUTH_STATUS_CODE_ERROR.AUTH_API_KEY_INACTIVE_ERROR}`
            );
        } else {
            const decrypted: IApiKeyRequestHashedData =
                await this.apiKeyService.decryptApiKey(
                    encrypted,
                    authApi.encryptionKey,
                    authApi.passphrase
                );

            const hasKey: boolean =
                'key' in decrypted &&
                'timestamp' in decrypted &&
                'hash' in decrypted;

            if (!hasKey) {
                verified(
                    null,
                    null,
                    `${ENUM_AUTH_STATUS_CODE_ERROR.AUTH_API_KEY_SCHEMA_INVALID_ERROR}`
                );
            } else if (key !== decrypted.key) {
                verified(
                    null,
                    null,
                    `${ENUM_AUTH_STATUS_CODE_ERROR.AUTH_API_KEY_INVALID_ERROR}`
                );
            } else {
                const validateApiKey: boolean =
                    await this.apiKeyService.validateHashApiKey(
                        decrypted.hash,
                        authApi.hash
                    );
                if (!validateApiKey) {
                    verified(
                        null,
                        null,
                        `${ENUM_AUTH_STATUS_CODE_ERROR.AUTH_API_KEY_INVALID_ERROR}`
                    );
                } else {
                    req.apiKey = {
                        _id: authApi._id,
                        key: authApi.key,
                        name: authApi.name,
                    };
                    verified(null, authApi);
                }
            }
        }
    }
}
