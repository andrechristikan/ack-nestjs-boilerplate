import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    PaginationQuery,
    PaginationQueryFilterInBoolean,
    PaginationQueryFilterInEnum,
} from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { RequestRequiredPipe } from 'src/common/request/pipes/request.required.pipe';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from 'src/common/response/interfaces/response.interface';
import { ENUM_API_KEY_TYPE } from 'src/modules/api-key/enums/api-key.enum';
import {
    API_KEY_DEFAULT_AVAILABLE_SEARCH,
    API_KEY_DEFAULT_IS_ACTIVE,
    API_KEY_DEFAULT_TYPE,
} from 'src/modules/api-key/constants/api-key.list.constant';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
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
} from 'src/modules/api-key/docs/api-key.admin.doc';
import { ApiKeyCreateRequestDto } from 'src/modules/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyUpdateDateRequestDto } from 'src/modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyUpdateRequestDto } from 'src/modules/api-key/dtos/request/api-key.update.request.dto';
import { ApiKeyCreateResponseDto } from 'src/modules/api-key/dtos/response/api-key.create.dto';
import { ApiKeyGetResponseDto } from 'src/modules/api-key/dtos/response/api-key.get.response.dto';
import { ApiKeyListResponseDto } from 'src/modules/api-key/dtos/response/api-key.list.response.dto';
import { ApiKeyResetResponseDto } from 'src/modules/api-key/dtos/response/api-key.reset.dto';
import { ApiKeyParsePipe } from 'src/modules/api-key/pipes/api-key.parse.pipe';
import { ApiKeyDoc } from 'src/modules/api-key/repository/entities/api-key.entity';
import { ApiKeyService } from 'src/modules/api-key/services/api-key.service';
import { AuthJwtAccessProtected } from 'src/modules/auth/decorators/auth.jwt.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from 'src/modules/policy/decorators/policy.decorator';
import { ApiKeyNotExpiredPipe } from 'src/modules/api-key/pipes/api-key.expired.pipe';
import { ApiKeyIsActivePipe } from 'src/modules/api-key/pipes/api-key.is-active.pipe';

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
    @ResponsePaging('apiKey.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationQuery({
            availableSearch: API_KEY_DEFAULT_AVAILABLE_SEARCH,
        })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterInBoolean('isActive', API_KEY_DEFAULT_IS_ACTIVE)
        isActive: Record<string, any>,
        @PaginationQueryFilterInEnum(
            'type',
            API_KEY_DEFAULT_TYPE,
            ENUM_API_KEY_TYPE
        )
        type: Record<string, any>
    ): Promise<IResponsePaging<ApiKeyListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            ...isActive,
            ...type,
        };

        const apiKeys: ApiKeyDoc[] = await this.apiKeyService.findAll(find, {
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
        const mapped = await this.apiKeyService.mapList(apiKeys);

        return {
            _pagination: { totalPage, total },
            data: mapped,
        };
    }

    @ApiKeyAdminGetDoc()
    @Response('apiKey.get')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/get/:apiKey')
    async get(
        @Param('apiKey', RequestRequiredPipe, ApiKeyParsePipe)
        apiKey: ApiKeyDoc
    ): Promise<IResponse<ApiKeyGetResponseDto>> {
        const mapped = await this.apiKeyService.mapGet(apiKey);
        return { data: mapped };
    }

    @ApiKeyAdminCreateDoc()
    @Response('apiKey.create')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.CREATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/create')
    async create(
        @Body() body: ApiKeyCreateRequestDto
    ): Promise<IResponse<ApiKeyCreateResponseDto>> {
        const created: ApiKeyCreateResponseDto =
            await this.apiKeyService.create(body);

        return {
            data: created,
        };
    }

    @ApiKeyAdminResetDoc()
    @Response('apiKey.reset')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:apiKey/reset')
    async reset(
        @Param(
            'apiKey',
            RequestRequiredPipe,
            ApiKeyParsePipe,
            new ApiKeyIsActivePipe([true]),
            ApiKeyNotExpiredPipe
        )
        apiKey: ApiKeyDoc
    ): Promise<IResponse<ApiKeyResetResponseDto>> {
        const updated: ApiKeyResetResponseDto =
            await this.apiKeyService.reset(apiKey);

        return {
            data: updated,
        };
    }

    @ApiKeyAdminUpdateDoc()
    @Response('apiKey.update')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:apiKey')
    async update(
        @Body() body: ApiKeyUpdateRequestDto,
        @Param(
            'apiKey',
            RequestRequiredPipe,
            ApiKeyParsePipe,
            new ApiKeyIsActivePipe([true]),
            ApiKeyNotExpiredPipe
        )
        apiKey: ApiKeyDoc
    ): Promise<IResponse<void>> {
        await this.apiKeyService.update(apiKey, body);

        return;
    }

    @ApiKeyAdminInactiveDoc()
    @Response('apiKey.inactive')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:apiKey/inactive')
    async inactive(
        @Param(
            'apiKey',
            RequestRequiredPipe,
            ApiKeyParsePipe,
            new ApiKeyIsActivePipe([true]),
            ApiKeyNotExpiredPipe
        )
        apiKey: ApiKeyDoc
    ): Promise<void> {
        await this.apiKeyService.inactive(apiKey);

        return;
    }

    @ApiKeyAdminActiveDoc()
    @Response('apiKey.active')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:apiKey/active')
    async active(
        @Param(
            'apiKey',
            RequestRequiredPipe,
            ApiKeyParsePipe,
            new ApiKeyIsActivePipe([false]),
            ApiKeyNotExpiredPipe
        )
        apiKey: ApiKeyDoc
    ): Promise<void> {
        await this.apiKeyService.active(apiKey);

        return;
    }

    @ApiKeyAdminUpdateDateDoc()
    @Response('apiKey.updateDate')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:apiKey/date')
    async updateDate(
        @Body() body: ApiKeyUpdateDateRequestDto,
        @Param(
            'apiKey',
            RequestRequiredPipe,
            ApiKeyParsePipe,
            new ApiKeyIsActivePipe([true])
        )
        apiKey: ApiKeyDoc
    ): Promise<IResponse<void>> {
        await this.apiKeyService.updateDate(apiKey, body);

        return;
    }

    @ApiKeyAdminDeleteDoc()
    @Response('apiKey.delete')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.DELETE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/delete/:apiKey')
    async delete(
        @Param('apiKey', RequestRequiredPipe, ApiKeyParsePipe)
        apiKey: ApiKeyDoc
    ): Promise<void> {
        await this.apiKeyService.delete(apiKey);

        return;
    }
}
