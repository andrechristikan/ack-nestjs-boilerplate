import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import Strategy from 'passport-headerapikey';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/modules/api-key/enums/api-key.status-code.enum';
import { ApiKeyEntity } from 'src/modules/api-key/repository/entities/api-key.entity';
import { ApiKeyService } from 'src/modules/api-key/services/api-key.service';

@Injectable()
export class ApiKeyXApiKeyStrategy extends PassportStrategy(
    Strategy,
    'x-api-key'
) {
    constructor(
        private readonly apiKeyService: ApiKeyService,
        private readonly helperDateService: HelperDateService
    ) {
        super(
            { header: 'X-API-KEY', prefix: '' },
            true,
            (
                xApiKey: string,
                verified: (
                    error: Error,
                    user?: Record<string, any>,
                    info?: string | number
                ) => Promise<void>,
                req: IRequestApp
            ) => this.validate(xApiKey, verified, req)
        );
    }

    async validate(
        xApiKey: string,
        verified: (
            error: Error,
            user?: Record<string, any>,
            info?: string | number
        ) => Promise<void>,
        req: IRequestApp
    ): Promise<void> {
        const xApiKeyArr: string[] = xApiKey.split(':');
        if (xApiKeyArr.length !== 2) {
            verified(
                new Error(
                    `${ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_INVALID}`
                ),
                null,
                null
            );

            return;
        }

        const key = xApiKeyArr[0];
        const secret = xApiKeyArr[1];
        const today = this.helperDateService.create();
        const apiKey: ApiKeyEntity =
            await this.apiKeyService.findOneByActiveKey(key);

        if (!apiKey) {
            verified(
                new Error(
                    `${ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_NOT_FOUND}`
                ),
                null,
                null
            );

            return;
        } else if (!apiKey.isActive) {
            verified(
                new Error(
                    `${ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_INACTIVE}`
                ),
                null,
                null
            );

            return;
        } else if (apiKey.startDate && apiKey.endDate) {
            if (today > apiKey.endDate) {
                verified(
                    new Error(
                        `${ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_EXPIRED}`
                    ),
                    null,
                    null
                );
            } else if (apiKey.startDate < today) {
                verified(
                    new Error(
                        `${ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_INACTIVE}`
                    ),
                    null,
                    null
                );
            }
        }

        const hashed = await this.apiKeyService.createHashApiKey(key, secret);
        const validateApiKey: boolean =
            await this.apiKeyService.validateHashApiKey(hashed, apiKey.hash);
        if (!validateApiKey) {
            verified(
                new Error(
                    `${ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_INVALID}`
                ),
                null,
                null
            );

            return;
        }

        req.apiKey = {
            _id: apiKey._id,
            name: apiKey._id,
            key: apiKey.key,
            type: apiKey.type,
        };
        verified(null, apiKey);

        return;
    }
}
