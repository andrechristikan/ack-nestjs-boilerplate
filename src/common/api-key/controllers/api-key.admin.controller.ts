import {
    Body,
    Controller,
    Get,
    InternalServerErrorException,
    Patch,
    Post,
    Put,
    Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    ApiKeyGetGuard,
    ApiKeyUpdateActiveGuard,
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
} from 'src/common/api-key/docs/api-key.admin.doc';
import { ApiKeyActiveDto } from 'src/common/api-key/dtos/api-key.active.dto';
import { ApiKeyCreateDto } from 'src/common/api-key/dtos/api-key.create.dto';
import { ApiKeyListDto } from 'src/common/api-key/dtos/api-key.list.dto';
import { ApiKeyRequestDto } from 'src/common/api-key/dtos/api-key.request.dto';
import { ApiKeyResetDto } from 'src/common/api-key/dtos/api-key.reset.dto';
import { IApiKeyEntity } from 'src/common/api-key/interfaces/api-key.interface';
import { ApiKeyEntity } from 'src/common/api-key/repository/entities/api-key.entity';
import { ApiKeyCreateSerialization } from 'src/common/api-key/serializations/api-key.create.serialization';
import { ApiKeyGetSerialization } from 'src/common/api-key/serializations/api-key.get.serialization';
import { ApiKeyListSerialization } from 'src/common/api-key/serializations/api-key.list.serialization';
import { ApiKeyResetSerialization } from 'src/common/api-key/serializations/api-key.reset.serialization';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';
import { ApiKeyUseCase } from 'src/common/api-key/use-cases/api-key.use-case';
import { ENUM_AUTH_PERMISSIONS } from 'src/common/auth/constants/auth.enum.permission.constant';
import { AuthJwtAdminAccessProtected } from 'src/common/auth/decorators/auth.jwt.decorator';
import { AuthPermissionProtected } from 'src/common/auth/decorators/auth.permission.decorator';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
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

@ApiTags('admin.apiKey')
@Controller({
    version: '1',
    path: '/api-key',
})
export class ApiKeyAdminController {
    constructor(
        private readonly apiKeyService: ApiKeyService,
        private readonly apiKeyUseCase: ApiKeyUseCase,
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
        @Query()
        {
            page,
            perPage,
            sort,
            search,
            availableSort,
            availableSearch,
        }: ApiKeyListDto
    ): Promise<IResponsePaging> {
        const skip: number = await this.paginationService.skip(page, perPage);
        const find: Record<string, any> = {
            ...search,
        };

        const apiKeys: ApiKeyEntity[] = await this.apiKeyService.findAll(find, {
            paging: {
                limit: perPage,
                skip: skip,
            },
            sort,
        });
        const totalData: number = await this.apiKeyService.getTotal(find);
        const totalPage: number = await this.paginationService.totalPage(
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
            const data: IApiKeyEntity = await this.apiKeyUseCase.create(body);
            const created: ApiKeyEntity = await this.apiKeyService.create(data);

            return {
                _id: created._id,
                secret: data.secret,
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
            const data: ApiKeyActiveDto = await this.apiKeyUseCase.inactive();
            await this.apiKeyService.updateIsActive(apiKey._id, data);
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
            const data: ApiKeyActiveDto = await this.apiKeyUseCase.active();
            await this.apiKeyService.updateIsActive(apiKey._id, data);
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
    @Put('/update/:apiKey/reset')
    async reset(@GetApiKey() apiKey: ApiKeyEntity): Promise<IResponse> {
        try {
            const data: ApiKeyResetDto = await this.apiKeyUseCase.reset(apiKey);
            const updated = await this.apiKeyService.updateResetById(
                apiKey._id,
                data
            );

            return {
                _id: updated._id,
                secret: data.secret,
            };
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                error: err.message,
            });
        }
    }
}
