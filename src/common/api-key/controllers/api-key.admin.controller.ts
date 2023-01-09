import {
    Body,
    Controller,
    Get,
    InternalServerErrorException,
    Patch,
    Post,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    API_KEY_DEFAULT_AVAILABLE_SEARCH,
    API_KEY_DEFAULT_AVAILABLE_SORT,
    API_KEY_DEFAULT_IS_ACTIVE,
    API_KEY_DEFAULT_PER_PAGE,
    API_KEY_DEFAULT_SORT,
} from 'src/common/api-key/constants/api-key.list.constant';
import {
    ApiKeyGetGuard,
    ApiKeyUpdateActiveGuard,
    ApiKeyUpdateGuard,
    ApiKeyUpdateInactiveGuard,
    ApiKeyUpdateResetGuard,
} from 'src/common/api-key/decorators/api-key.admin.decorator';
import { GetApiKey } from 'src/common/api-key/decorators/api-key.decorator';
import {
    ApiKeyActiveDoc,
    ApiKeyCreateDoc,
    ApiKeyGetDoc,
    ApiKeyInactiveDoc,
    ApiKeyListDoc,
    ApiKeyResetDoc,
    ApiKeyUpdateDoc,
} from 'src/common/api-key/docs/api-key.admin.doc';
import { ApiKeyCreateDto } from 'src/common/api-key/dtos/api-key.create.dto';
import { ApiKeyRequestDto } from 'src/common/api-key/dtos/api-key.request.dto';
import { ApiKeyUpdateDateDto } from 'src/common/api-key/dtos/api-key.update-date.dto';
import { ApiKeyUpdateDto } from 'src/common/api-key/dtos/api-key.update.dto';
import { IApiKeyEntity } from 'src/common/api-key/interfaces/api-key.interface';
import { ApiKeyEntity } from 'src/common/api-key/repository/entities/api-key.entity';
import { ApiKeyCreateSerialization } from 'src/common/api-key/serializations/api-key.create.serialization';
import { ApiKeyGetSerialization } from 'src/common/api-key/serializations/api-key.get.serialization';
import { ApiKeyListSerialization } from 'src/common/api-key/serializations/api-key.list.serialization';
import { ApiKeyResetSerialization } from 'src/common/api-key/serializations/api-key.reset.serialization';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';
import { ENUM_AUTH_PERMISSIONS } from 'src/common/auth/constants/auth.enum.permission.constant';
import { AuthJwtAdminAccessProtected } from 'src/common/auth/decorators/auth.jwt.decorator';
import { AuthPermissionProtected } from 'src/common/auth/decorators/auth.permission.decorator';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import {
    PaginationQuery,
    PaginationQueryFilterInBoolean,
} from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { RequestParamGuard } from 'src/common/request/decorators/request.decorator';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from 'src/common/response/interfaces/response.interface';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';

@ApiTags('admin.apiKey')
@Controller({
    version: '1',
    path: '/api-key',
})
export class ApiKeyAdminController {
    constructor(
        private readonly apiKeyService: ApiKeyService,
        private readonly paginationService: PaginationService
    ) {}

    @ApiKeyListDoc()
    @ResponsePaging('apiKey.list', {
        serialization: ApiKeyListSerialization,
    })
    @AuthPermissionProtected(ENUM_AUTH_PERMISSIONS.API_KEY_READ)
    @AuthJwtAdminAccessProtected()
    @Get('/list')
    async list(
        @PaginationQuery(
            API_KEY_DEFAULT_PER_PAGE,
            API_KEY_DEFAULT_AVAILABLE_SEARCH,
            API_KEY_DEFAULT_SORT,
            API_KEY_DEFAULT_AVAILABLE_SORT
        )
        {
            page,
            perPage,
            sort,
            offset,
            search,
            availableSort,
            availableSearch,
        }: PaginationListDto,
        @PaginationQueryFilterInBoolean('isActive', API_KEY_DEFAULT_IS_ACTIVE)
        isActive: Record<string, any>
    ): Promise<IResponsePaging> {
        const find: Record<string, any> = {
            ...search,
            ...isActive,
        };

        const apiKeys: ApiKeyEntity[] = await this.apiKeyService.findAll(find, {
            paging: {
                limit: perPage,
                offset,
            },
            sort,
        });
        const totalData: number = await this.apiKeyService.getTotal(find);
        const totalPage: number = this.paginationService.totalPage(
            totalData,
            perPage
        );

        return {
            totalData,
            totalPage,
            currentPage: page,
            perPage,
            availableSearch,
            availableSort,
            data: apiKeys,
        };
    }

    @ApiKeyGetDoc()
    @Response('apiKey.get', {
        serialization: ApiKeyGetSerialization,
    })
    @ApiKeyGetGuard()
    @RequestParamGuard(ApiKeyRequestDto)
    @AuthPermissionProtected(ENUM_AUTH_PERMISSIONS.API_KEY_READ)
    @AuthJwtAdminAccessProtected()
    @Get('get/:apiKey')
    async get(@GetApiKey() apiKey: ApiKeyEntity): Promise<IResponse> {
        return apiKey;
    }

    @ApiKeyCreateDoc()
    @Response('apiKey.create', { serialization: ApiKeyCreateSerialization })
    @AuthPermissionProtected(
        ENUM_AUTH_PERMISSIONS.API_KEY_READ,
        ENUM_AUTH_PERMISSIONS.API_KEY_CREATE
    )
    @AuthJwtAdminAccessProtected()
    @Post('/create')
    async create(@Body() body: ApiKeyCreateDto): Promise<IResponse> {
        try {
            const created: IApiKeyEntity = await this.apiKeyService.create(
                body
            );

            return {
                _id: created._id,
                secret: created.secret,
            };
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                error: err.message,
            });
        }
    }

    @ApiKeyInactiveDoc()
    @Response('apiKey.inactive')
    @ApiKeyUpdateInactiveGuard()
    @RequestParamGuard(ApiKeyRequestDto)
    @AuthPermissionProtected(
        ENUM_AUTH_PERMISSIONS.API_KEY_READ,
        ENUM_AUTH_PERMISSIONS.API_KEY_UPDATE,
        ENUM_AUTH_PERMISSIONS.API_KEY_INACTIVE
    )
    @AuthJwtAdminAccessProtected()
    @Patch('/update/:apiKey/inactive')
    async inactive(@GetApiKey() apiKey: ApiKeyEntity): Promise<void> {
        try {
            await this.apiKeyService.inactive(apiKey._id);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                error: err.message,
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
    @AuthJwtAdminAccessProtected()
    @Patch('/update/:apiKey/active')
    async active(@GetApiKey() apiKey: ApiKeyEntity): Promise<void> {
        try {
            await this.apiKeyService.active(apiKey._id);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                error: err.message,
            });
        }

        return;
    }

    @ApiKeyResetDoc()
    @Response('apiKey.reset', { serialization: ApiKeyResetSerialization })
    @ApiKeyUpdateResetGuard()
    @RequestParamGuard(ApiKeyRequestDto)
    @AuthPermissionProtected(
        ENUM_AUTH_PERMISSIONS.API_KEY_READ,
        ENUM_AUTH_PERMISSIONS.API_KEY_UPDATE,
        ENUM_AUTH_PERMISSIONS.API_KEY_RESET
    )
    @AuthJwtAdminAccessProtected()
    @Patch('/update/:apiKey/reset')
    async reset(@GetApiKey() apiKey: ApiKeyEntity): Promise<IResponse> {
        try {
            const updated: IApiKeyEntity = await this.apiKeyService.reset(
                apiKey._id,
                apiKey.key
            );

            return {
                _id: updated._id,
                secret: updated.secret,
            };
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                error: err.message,
            });
        }
    }

    @ApiKeyUpdateDoc()
    @Response('apiKey.update', { serialization: ResponseIdSerialization })
    @ApiKeyUpdateGuard()
    @RequestParamGuard(ApiKeyRequestDto)
    @AuthPermissionProtected(
        ENUM_AUTH_PERMISSIONS.API_KEY_READ,
        ENUM_AUTH_PERMISSIONS.API_KEY_UPDATE
    )
    @AuthJwtAdminAccessProtected()
    @Put('/update/:apiKey')
    async updateName(
        @Body() body: ApiKeyUpdateDto,
        @GetApiKey() apiKey: ApiKeyEntity
    ): Promise<IResponse> {
        try {
            await this.apiKeyService.update(apiKey._id, body);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                error: err.message,
            });
        }

        return { _id: apiKey._id };
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
    @AuthJwtAdminAccessProtected()
    @Put('/update/:apiKey/date')
    async updateDate(
        @Body() body: ApiKeyUpdateDateDto,
        @GetApiKey() apiKey: ApiKeyEntity
    ): Promise<IResponse> {
        try {
            await this.apiKeyService.updateDate(apiKey._id, body);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                error: err.message,
            });
        }

        return { _id: apiKey._id };
    }
}
