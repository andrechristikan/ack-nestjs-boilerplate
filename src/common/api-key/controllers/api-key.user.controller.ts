import {
    Body,
    ConflictException,
    Controller,
    Get,
    InternalServerErrorException,
    Patch,
    Post,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    API_KEY_DEFAULT_AVAILABLE_ORDER_BY,
    API_KEY_DEFAULT_AVAILABLE_SEARCH,
    API_KEY_DEFAULT_IS_ACTIVE,
    API_KEY_DEFAULT_ORDER_BY,
    API_KEY_DEFAULT_ORDER_DIRECTION,
    API_KEY_DEFAULT_PER_PAGE,
} from 'src/common/api-key/constants/api-key.list.constant';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/common/api-key/constants/api-key.status-code.constant';
import { GetApiKey } from 'src/common/api-key/decorators/api-key.decorator';
import {
    ApiKeyUserGetGuard,
    ApiKeyUserUpdateGuard,
    ApiKeyUserUpdateResetGuard,
} from 'src/common/api-key/decorators/api-key.user.decorator';
import {
    ApiKeyCreateDoc,
    ApiKeyGetDoc,
    ApiKeyListDoc,
    ApiKeyResetDoc,
    ApiKeyUpdateDoc,
} from 'src/common/api-key/docs/api-key.admin.doc';
import { ApiKeyCreateByUserDto } from 'src/common/api-key/dtos/api-key.create.dto';
import { ApiKeyRequestDto } from 'src/common/api-key/dtos/api-key.request.dto';
import { ApiKeyUpdateDto } from 'src/common/api-key/dtos/api-key.update.dto';
import { IApiKeyCreated } from 'src/common/api-key/interfaces/api-key.interface';
import {
    ApiKeyDoc,
    ApiKeyEntity,
} from 'src/common/api-key/repository/entities/api-key.entity';
import { ApiKeyCreateSerialization } from 'src/common/api-key/serializations/api-key.create.serialization';
import { ApiKeyGetSerialization } from 'src/common/api-key/serializations/api-key.get.serialization';
import { ApiKeyListSerialization } from 'src/common/api-key/serializations/api-key.list.serialization';
import { ApiKeyResetSerialization } from 'src/common/api-key/serializations/api-key.reset.serialization';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';
import {
    AuthJwtPublicAccessProtected,
    AuthJwtPayload,
} from 'src/common/auth/decorators/auth.jwt.decorator';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import {
    PaginationQuery,
    PaginationQueryFilterInBoolean,
} from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from 'src/common/policy/constants/policy.enum.constant';
import { PolicyAbilityProtected } from 'src/common/policy/decorators/policy.decorator';
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

@ApiTags('common.apiKey.user')
@Controller({
    version: '1',
    path: '/api-key',
})
export class ApiKeyUserController {
    constructor(
        private readonly apiKeyService: ApiKeyService,
        private readonly paginationService: PaginationService
    ) {}

    @ApiKeyListDoc()
    @ResponsePaging('apiKey.list', {
        serialization: ApiKeyListSerialization,
    })
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @AuthJwtPublicAccessProtected()
    @Get('/list')
    async list(
        @PaginationQuery(
            API_KEY_DEFAULT_PER_PAGE,
            API_KEY_DEFAULT_ORDER_BY,
            API_KEY_DEFAULT_ORDER_DIRECTION,
            API_KEY_DEFAULT_AVAILABLE_SEARCH,
            API_KEY_DEFAULT_AVAILABLE_ORDER_BY
        )
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterInBoolean('isActive', API_KEY_DEFAULT_IS_ACTIVE)
        isActive: Record<string, any>,
        @AuthJwtPayload('_id') user: string
    ): Promise<IResponsePaging> {
        const find: Record<string, any> = {
            ..._search,
            ...isActive,
        };

        const apiKeys: ApiKeyEntity[] = await this.apiKeyService.findAllByUser(
            user,
            find,
            {
                paging: {
                    limit: _limit,
                    offset: _offset,
                },
                order: _order,
            }
        );
        const total: number = await this.apiKeyService.getTotalByUser(
            user,
            find
        );
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        return {
            _pagination: { totalPage, total },
            data: apiKeys,
        };
    }

    @ApiKeyGetDoc()
    @Response('apiKey.get', {
        serialization: ApiKeyGetSerialization,
    })
    @ApiKeyUserGetGuard()
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @AuthJwtPublicAccessProtected()
    @RequestParamGuard(ApiKeyRequestDto)
    @Get('get/:apiKey')
    async get(@GetApiKey(true) apiKey: ApiKeyEntity): Promise<IResponse> {
        return { data: apiKey };
    }

    @ApiKeyCreateDoc()
    @Response('apiKey.create', { serialization: ApiKeyCreateSerialization })
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.CREATE],
    })
    @AuthJwtPublicAccessProtected()
    @Post('/create')
    async create(
        @AuthJwtPayload('_id') user: string,
        @Body() body: ApiKeyCreateByUserDto
    ): Promise<IResponse> {
        const checkUser: boolean = await this.apiKeyService.existByUser(user);
        if (checkUser) {
            throw new ConflictException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_EXIST_ERROR,
                message: 'apiKey.error.exist',
            });
        }

        try {
            const created: IApiKeyCreated =
                await this.apiKeyService.createByUser(user, body);

            return {
                data: {
                    _id: created.doc._id,
                    secret: created.secret,
                },
            };
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }
    }

    @ApiKeyResetDoc()
    @Response('apiKey.reset', { serialization: ApiKeyResetSerialization })
    @ApiKeyUserUpdateResetGuard()
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @AuthJwtPublicAccessProtected()
    @RequestParamGuard(ApiKeyRequestDto)
    @Patch('/update/:apiKey/reset')
    async reset(@GetApiKey() apiKey: ApiKeyDoc): Promise<IResponse> {
        try {
            const secret: string = await this.apiKeyService.createSecret();
            const updated: ApiKeyDoc = await this.apiKeyService.reset(
                apiKey,
                secret
            );

            return {
                data: {
                    _id: updated._id,
                    secret,
                },
            };
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }
    }

    @ApiKeyUpdateDoc()
    @Response('apiKey.update', { serialization: ResponseIdSerialization })
    @ApiKeyUserUpdateGuard()
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @AuthJwtPublicAccessProtected()
    @RequestParamGuard(ApiKeyRequestDto)
    @Put('/update/:apiKey')
    async updateName(
        @Body() body: ApiKeyUpdateDto,
        @GetApiKey() apiKey: ApiKeyDoc
    ): Promise<IResponse> {
        try {
            await this.apiKeyService.update(apiKey, body);
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
