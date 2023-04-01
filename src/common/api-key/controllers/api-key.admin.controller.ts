import {
    Body,
    Controller,
    InternalServerErrorException,
    Patch,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    ApiKeyUpdateActiveGuard,
    ApiKeyUpdateGuard,
    ApiKeyUpdateInactiveGuard,
} from 'src/common/api-key/decorators/api-key.admin.decorator';
import { GetApiKey } from 'src/common/api-key/decorators/api-key.decorator';
import {
    ApiKeyActiveDoc,
    ApiKeyInactiveDoc,
    ApiKeyUpdateDoc,
} from 'src/common/api-key/docs/api-key.admin.doc';
import { ApiKeyRequestDto } from 'src/common/api-key/dtos/api-key.request.dto';
import { ApiKeyUpdateDateDto } from 'src/common/api-key/dtos/api-key.update-date.dto';
import { ApiKeyDoc } from 'src/common/api-key/repository/entities/api-key.entity';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';
import { ENUM_AUTH_PERMISSIONS } from 'src/common/auth/constants/auth.enum.permission.constant';
import { AuthJwtAccessProtected } from 'src/common/auth/decorators/auth.jwt.decorator';
import { AuthPermissionProtected } from 'src/common/auth/decorators/auth.permission.decorator';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import { RequestParamGuard } from 'src/common/request/decorators/request.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';

@ApiTags('admin.apiKey')
@Controller({
    version: '1',
    path: '/api-key',
})
export class ApiKeyAdminController {
    constructor(private readonly apiKeyService: ApiKeyService) {}

    @ApiKeyInactiveDoc()
    @Response('apiKey.inactive')
    @ApiKeyUpdateInactiveGuard()
    @RequestParamGuard(ApiKeyRequestDto)
    @AuthPermissionProtected(
        ENUM_AUTH_PERMISSIONS.API_KEY_READ,
        ENUM_AUTH_PERMISSIONS.API_KEY_UPDATE,
        ENUM_AUTH_PERMISSIONS.API_KEY_INACTIVE
    )
    @AuthJwtAccessProtected()
    @Patch('/update/:apiKey/inactive')
    async inactive(@GetApiKey() apiKey: ApiKeyDoc): Promise<void> {
        try {
            await this.apiKeyService.inactive(apiKey);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }

        return;
    }

    @ApiKeyActiveDoc()
    @Response('apiKey.active')
    @ApiKeyUpdateActiveGuard()
    @RequestParamGuard(ApiKeyRequestDto)
    @AuthPermissionProtected(
        ENUM_AUTH_PERMISSIONS.API_KEY_READ,
        ENUM_AUTH_PERMISSIONS.API_KEY_UPDATE,
        ENUM_AUTH_PERMISSIONS.API_KEY_ACTIVE
    )
    @AuthJwtAccessProtected()
    @Patch('/update/:apiKey/active')
    async active(@GetApiKey() apiKey: ApiKeyDoc): Promise<void> {
        try {
            await this.apiKeyService.active(apiKey);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }

        return;
    }

    @ApiKeyUpdateDoc()
    @Response('apiKey.updateDate', { serialization: ResponseIdSerialization })
    @ApiKeyUpdateGuard()
    @RequestParamGuard(ApiKeyRequestDto)
    @AuthPermissionProtected(
        ENUM_AUTH_PERMISSIONS.API_KEY_READ,
        ENUM_AUTH_PERMISSIONS.API_KEY_UPDATE,
        ENUM_AUTH_PERMISSIONS.API_KEY_UPDATE_DATE
    )
    @AuthJwtAccessProtected()
    @Put('/update/:apiKey/date')
    async updateDate(
        @Body() body: ApiKeyUpdateDateDto,
        @GetApiKey() apiKey: ApiKeyDoc
    ): Promise<IResponse> {
        try {
            await this.apiKeyService.updateDate(apiKey, body);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }

        return { data: { _id: apiKey._id } };
    }
}
