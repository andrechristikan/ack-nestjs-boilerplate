import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import Strategy from 'passport-headerapikey';
import { AuthApiService } from 'src/auth/service/auth.api.service';
import { AuthApiDocument } from 'src/auth/schema/auth.api.schema';
import { IAuthApiRequestHashedData } from 'src/auth/auth.interface';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/auth/auth.constant';
import { IRequestApp } from 'src/utils/request/request.interface';
import { HelperNumberService } from 'src/utils/helper/service/helper.number.service';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
    constructor(
        private readonly authApiService: AuthApiService,
        private readonly helperNumberService: HelperNumberService
    ) {
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

    async validate<TUser = any>(
        apiKey: string,
        verified: (
            error: Error,
            user?: TUser,
            info?: string | number
        ) => Promise<void>,
        req: any
    ) {
        const xApiKey: string[] = apiKey.split(':');
        const key = xApiKey[0];
        const encrypted = xApiKey[1];

        const authApi: AuthApiDocument = await this.authApiService.findOneByKey(
            key
        );

        if (!authApi) {
            verified(
                null,
                null,
                `${ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_API_KEY_NOT_FOUND_ERROR}`
            );
        } else if (!authApi.isActive) {
            verified(
                null,
                null,
                `${ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_API_KEY_INACTIVE_ERROR}`
            );
        } else {
            const decrypted: IAuthApiRequestHashedData =
                await this.authApiService.decryptApiKey(
                    encrypted,
                    authApi.encryptionKey,
                    authApi.passphrase
                );

            const keys: string[] = ['key', 'timestamp', 'hash'];
            const deKeys: string[] = Object.keys(decrypted);
            const hasKey: boolean = keys.every((key) => deKeys.includes(key));

            const timestamp: number = this.helperNumberService.create(
                req.headers['x-timestamp'] as string
            );

            if (!hasKey) {
                verified(
                    null,
                    null,
                    `${ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_API_KEY_SCHEMA_INVALID_ERROR}`
                );
            } else if (key !== decrypted.key) {
                verified(
                    null,
                    null,
                    `${ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_API_KEY_INVALID_ERROR}`
                );
            } else if (!timestamp || timestamp !== decrypted.timestamp) {
                verified(
                    new Error(
                        `${ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_API_KEY_TIMESTAMP_NOT_MATCH_WITH_REQUEST_ERROR}`
                    )
                );
            } else {
                const validateApiKey: boolean =
                    await this.authApiService.validateHashApiKey(
                        decrypted.hash,
                        authApi.hash
                    );
                if (!validateApiKey) {
                    verified(
                        null,
                        null,
                        `${ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_API_KEY_INVALID_ERROR}`
                    );
                }

                req.apiKey = {
                    _id: authApi._id,
                    key: authApi.key,
                    name: authApi.name,
                    description: authApi.description,
                };
                verified(null, authApi as any);
            }
        }
    }
}
