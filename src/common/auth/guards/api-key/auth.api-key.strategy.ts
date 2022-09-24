import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import Strategy from 'passport-headerapikey';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/common/auth/constants/auth.status-code.constant';
import { IAuthApiRequestHashedData } from 'src/common/auth/interfaces/auth.interface';
import { AuthApiDocument } from 'src/common/auth/schemas/auth.api.schema';
import { AuthApiService } from 'src/common/auth/services/auth.api.service';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { HelperNumberService } from 'src/common/helper/services/helper.number.service';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/constants/request.status-code.constant';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
    constructor(
        private readonly authApiService: AuthApiService,
        private readonly helperNumberService: HelperNumberService,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService
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

    async validate(
        apiKey: string,
        verified: (
            error: Error,
            user?: AuthApiDocument,
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
                `${ENUM_AUTH_STATUS_CODE_ERROR.AUTH_API_KEY_NOT_FOUND_ERROR}`
            );
        } else if (!authApi.isActive) {
            verified(
                null,
                null,
                `${ENUM_AUTH_STATUS_CODE_ERROR.AUTH_API_KEY_INACTIVE_ERROR}`
            );
        } else {
            const decrypted: IAuthApiRequestHashedData =
                await this.authApiService.decryptApiKey(
                    encrypted,
                    authApi.encryptionKey,
                    authApi.passphrase
                );

            const hasKey: boolean =
                'key' in decrypted &&
                'timestamp' in decrypted &&
                'hash' in decrypted;

            const requestTimestamp: string = req.headers['x-timestamp'];
            if (!requestTimestamp) {
                verified(
                    null,
                    null,
                    `${ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_TIMESTAMP_INVALID_ERROR}`
                );
            } else if (!hasKey) {
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
                const timestamp =
                    this.helperNumberService.create(requestTimestamp);
                const checkTimestamp: boolean =
                    this.helperDateService.checkTimestamp(timestamp);

                if (!timestamp || !checkTimestamp) {
                    verified(
                        null,
                        null,
                        `${ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_TIMESTAMP_INVALID_ERROR}`
                    );
                } else if (timestamp !== decrypted.timestamp) {
                    verified(
                        new Error(
                            `${ENUM_AUTH_STATUS_CODE_ERROR.AUTH_API_KEY_TIMESTAMP_NOT_MATCH_WITH_REQUEST_ERROR}`
                        )
                    );
                } else {
                    const toleranceTimeInMs = this.configService.get<number>(
                        'middleware.timestamp.toleranceTimeInMs'
                    );

                    const toleranceMin =
                        this.helperDateService.backwardInMilliseconds(
                            toleranceTimeInMs
                        );
                    const toleranceMax =
                        this.helperDateService.forwardInMilliseconds(
                            toleranceTimeInMs
                        );
                    const timestampDate = this.helperDateService.create({
                        date: timestamp,
                    });

                    if (
                        timestampDate < toleranceMin ||
                        timestampDate > toleranceMax
                    ) {
                        verified(
                            null,
                            null,
                            `${ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_TIMESTAMP_INVALID_ERROR}`
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
    }
}
