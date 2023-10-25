import {
    Body,
    Controller,
    Delete,
    Get,
    Patch,
    Post,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ENUM_API_KEY_TYPE } from 'src/common/api-key/constants/api-key.enum.constant';
import {
    API_KEY_DEFAULT_AVAILABLE_ORDER_BY,
    API_KEY_DEFAULT_AVAILABLE_SEARCH,
    API_KEY_DEFAULT_IS_ACTIVE,
    API_KEY_DEFAULT_ORDER_BY,
    API_KEY_DEFAULT_ORDER_DIRECTION,
    API_KEY_DEFAULT_PER_PAGE,
    API_KEY_DEFAULT_TYPE,
} from 'src/common/api-key/constants/api-key.list.constant';
import {
    ApiKeyAdminDeleteGuard,
    ApiKeyAdminGetGuard,
    ApiKeyAdminUpdateActiveGuard,
    ApiKeyAdminUpdateGuard,
    ApiKeyAdminUpdateInactiveGuard,
    ApiKeyAdminUpdateResetGuard,
} from 'src/common/api-key/decorators/api-key.admin.decorator';
import {
    ApiKeyPublicProtected,
    GetApiKey,
} from 'src/common/api-key/decorators/api-key.decorator';
import {
    ApiKeyAdminActiveDoc,
    ApiKeyAdminCreateDoc,
    ApiKeyAdminDeleteDoc,
    ApiKeyAdminGetDoc,
    ApiKeyAdminInactiveDoc,
    ApiKeyAdminListDoc,
    ApiKeyAdminResetDoc,
    ApiKeyAdminUpdateDateDoc,
    ApiKeyAdminUpdateDoc,
} from 'src/common/api-key/docs/api-key.admin.doc';
import { ApiKeyCreateDto } from 'src/common/api-key/dtos/api-key.create.dto';
import { ApiKeyRequestDto } from 'src/common/api-key/dtos/api-key.request.dto';
import { ApiKeyUpdateDateDto } from 'src/common/api-key/dtos/api-key.update-date.dto';
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
import { AuthJwtAdminAccessProtected } from 'src/common/auth/decorators/auth.jwt.decorator';
import {
    PaginationQuery,
    PaginationQueryFilterInBoolean,
    PaginationQueryFilterInEnum,
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

@ApiTags('common.admin.apiKey')
@Controller({
    version: '1',
    path: '/api-key',
})
export class ApiKeyAdminController {
    constructor(
        private readonly apiKeyService: ApiKeyService,
        private readonly paginationService: PaginationService
    ) {}

    @ApiKeyAdminListDoc()
    @ResponsePaging('apiKey.list', {
        serialization: ApiKeyListSerialization,
    })
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @AuthJwtAdminAccessProtected()
    @ApiKeyPublicProtected()
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
        @PaginationQueryFilterInEnum(
            'type',
            API_KEY_DEFAULT_TYPE,
            ENUM_API_KEY_TYPE
        )
        type: Record<string, any>
    ): Promise<IResponsePaging> {
        const find: Record<string, any> = {
            ..._search,
            ...isActive,
            ...type,
        };

        const apiKeys: ApiKeyEntity[] = await this.apiKeyService.findAll(find, {
            paging: {
                limit: _limit,
                offset: _offset,
            },
            order: _order,
        });
        const total: number = await this.apiKeyService.getTotal(find);
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        return {
            _pagination: { totalPage, total },
            data: apiKeys,
        };
    }

    @ApiKeyAdminGetDoc()
    @Response('apiKey.get', {
        serialization: ApiKeyGetSerialization,
    })
    @ApiKeyAdminGetGuard()
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @AuthJwtAdminAccessProtected()
    @ApiKeyPublicProtected()
    @RequestParamGuard(ApiKeyRequestDto)
    @Get('/get/:apiKey')
    async get(@GetApiKey(true) apiKey: ApiKeyEntity): Promise<IResponse> {
        return { data: apiKey };
    }

    @ApiKeyAdminCreateDoc()
    @Response('apiKey.create', { serialization: ApiKeyCreateSerialization })
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.CREATE],
    })
    @AuthJwtAdminAccessProtected()
    @ApiKeyPublicProtected()
    @Post('/create')
    async create(@Body() body: ApiKeyCreateDto): Promise<IResponse> {
        const created: IApiKeyCreated = await this.apiKeyService.create(body);

        return {
            data: {
                _id: created.doc._id,
                secret: created.secret,
            },
        };
    }

    @ApiKeyAdminResetDoc()
    @Response('apiKey.reset', { serialization: ApiKeyResetSerialization })
    @ApiKeyAdminUpdateResetGuard()
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @AuthJwtAdminAccessProtected()
    @ApiKeyPublicProtected()
    @RequestParamGuard(ApiKeyRequestDto)
    @Patch('/update/:apiKey/reset')
    async reset(@GetApiKey() apiKey: ApiKeyDoc): Promise<IResponse> {
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
    }

    @ApiKeyAdminUpdateDoc()
    @Response('apiKey.update', { serialization: ResponseIdSerialization })
    @ApiKeyAdminUpdateGuard()
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @AuthJwtAdminAccessProtected()
    @ApiKeyPublicProtected()
    @RequestParamGuard(ApiKeyRequestDto)
    @Put('/update/:apiKey')
    async updateName(
        @Body() body: ApiKeyUpdateDto,
        @GetApiKey() apiKey: ApiKeyDoc
    ): Promise<IResponse> {
        await this.apiKeyService.update(apiKey, body);

        return { data: { _id: apiKey._id } };
    }

    @ApiKeyAdminInactiveDoc()
    @Response('apiKey.inactive')
    @ApiKeyAdminUpdateInactiveGuard()
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @AuthJwtAdminAccessProtected()
    @ApiKeyPublicProtected()
    @RequestParamGuard(ApiKeyRequestDto)
    @Patch('/update/:apiKey/inactive')
    async inactive(@GetApiKey() apiKey: ApiKeyDoc): Promise<void> {
        await this.apiKeyService.inactive(apiKey);

        return;
    }

    @ApiKeyAdminActiveDoc()
    @Response('apiKey.active')
    @ApiKeyAdminUpdateActiveGuard()
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @AuthJwtAdminAccessProtected()
    @ApiKeyPublicProtected()
    @RequestParamGuard(ApiKeyRequestDto)
    @Patch('/update/:apiKey/active')
    async active(@GetApiKey() apiKey: ApiKeyDoc): Promise<void> {
        await this.apiKeyService.active(apiKey);

        return;
    }

    @ApiKeyAdminUpdateDateDoc()
    @Response('apiKey.updateDate', { serialization: ResponseIdSerialization })
    @ApiKeyAdminUpdateGuard()
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @AuthJwtAdminAccessProtected()
    @ApiKeyPublicProtected()
    @RequestParamGuard(ApiKeyRequestDto)
    @Put('/update/:apiKey/date')
    async updateDate(
        @Body() body: ApiKeyUpdateDateDto,
        @GetApiKey() apiKey: ApiKeyDoc
    ): Promise<IResponse> {
        await this.apiKeyService.updateDate(apiKey, body);

        return { data: { _id: apiKey._id } };
    }

    @ApiKeyAdminDeleteDoc()
    @Response('apiKey.delete')
    @ApiKeyAdminDeleteGuard()
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.DELETE],
    })
    @AuthJwtAdminAccessProtected()
    @ApiKeyPublicProtected()
    @RequestParamGuard(ApiKeyRequestDto)
    @Delete('/delete/:apiKey')
    async delete(@GetApiKey() apiKey: ApiKeyDoc): Promise<void> {
        await this.apiKeyService.delete(apiKey);

        return;
    }
}
