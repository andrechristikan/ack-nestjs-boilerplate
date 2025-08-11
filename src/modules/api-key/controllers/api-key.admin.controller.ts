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
} from '@common/pagination/decorators/pagination.decorator';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import { ENUM_API_KEY_TYPE } from '@modules/api-key/enums/api-key.enum';
import {
    API_KEY_DEFAULT_AVAILABLE_SEARCH,
    API_KEY_DEFAULT_TYPE,
} from '@modules/api-key/constants/api-key.list.constant';
import { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyUpdateRequestDto } from '@modules/api-key/dtos/request/api-key.update.request.dto';
import { ApiKeyCreateResponseDto } from '@modules/api-key/dtos/response/api-key.create.response.dto';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyResponseDto } from '@modules/api-key/dtos/response/api-key.response.dto';
import {
    ApiKeyAdminActiveDoc,
    ApiKeyAdminCreateDoc,
    ApiKeyAdminDeleteDoc,
    ApiKeyAdminInactiveDoc,
    ApiKeyAdminListDoc,
    ApiKeyAdminResetDoc,
    ApiKeyAdminUpdateDateDoc,
    ApiKeyAdminUpdateDoc,
} from '@modules/api-key/docs/api-key.admin.doc';
import { IPaginationQueryReturn } from '@common/pagination/interfaces/pagination.interface';
import { IDatabaseFilterOperation } from '@common/database/interfaces/database.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { ApiKeyEntity } from '@modules/api-key/repository/entities/api-key.entity';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '@modules/policy/enums/policy.enum';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from '@modules/policy/decorators/policy.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { RequestObjectIdPipe } from '@common/request/pipes/requiest.object-id.pipe';

@ApiTags('modules.admin.apiKey')
@Controller({
    version: '1',
    path: '/api-key',
})
export class ApiKeyAdminController {
    // TODO: CHANGE THIS WITH USE CASES
    constructor(private readonly apiKeyService: ApiKeyService) {}

    @ApiKeyAdminListDoc()
    @ResponsePaging('apiKey.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    // @UserProtected() // TODO: Resolve this
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationQuery({
            availableSearch: API_KEY_DEFAULT_AVAILABLE_SEARCH,
        })
        pagination: IPaginationQueryReturn,
        @PaginationQueryFilterInBoolean('isActive')
        isActive?: Record<string, IDatabaseFilterOperation>,
        @PaginationQueryFilterInEnum<ENUM_API_KEY_TYPE>(
            'type',
            API_KEY_DEFAULT_TYPE
        )
        type?: Record<string, IDatabaseFilterOperation>
    ): Promise<IResponsePagingReturn<ApiKeyResponseDto>> {
        const results: IResponsePagingReturn<ApiKeyResponseDto> =
            await this.apiKeyService.getList(pagination, isActive, type);

        return results;
    }

    @ApiKeyAdminCreateDoc()
    @Response('apiKey.create')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.CREATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    // @UserProtected() // TODO: Resolve this
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/create')
    async create(
        @Body() body: ApiKeyCreateRequestDto
    ): Promise<IResponseReturn<ApiKeyCreateResponseDto>> {
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
    // @UserProtected() // TODO: Resolve this
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:apiKey/reset')
    async reset(
        @Param('apiKey', RequestRequiredPipe, RequestObjectIdPipe)
        apiKey: string
    ): Promise<IResponseReturn<ApiKeyCreateResponseDto>> {
        const updated: ApiKeyCreateResponseDto =
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
    // @UserProtected() // TODO: Resolve this
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:apiKey')
    async update(
        @Body() body: ApiKeyUpdateRequestDto,
        @Param('apiKey', RequestRequiredPipe, RequestObjectIdPipe)
        apiKey: string
    ): Promise<IResponseReturn<ApiKeyResponseDto>> {
        const updated = await this.apiKeyService.update(apiKey, body);

        return {
            data: updated,
        };
    }

    @ApiKeyAdminUpdateDateDoc()
    @Response('apiKey.updateDate')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    // @UserProtected() // TODO: Resolve this
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:apiKey/date')
    async updateDate(
        @Body() body: ApiKeyUpdateDateRequestDto,
        @Param('apiKey', RequestRequiredPipe, RequestObjectIdPipe)
        apiKey: string
    ): Promise<IResponseReturn<ApiKeyResponseDto>> {
        const updated = await this.apiKeyService.updateDate(apiKey, body);

        return {
            data: updated,
        };
    }

    @ApiKeyAdminInactiveDoc()
    @Response('apiKey.inactive')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    // @UserProtected() // TODO: Resolve this
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:apiKey/inactive')
    async inactive(
        @Param('apiKey', RequestRequiredPipe, RequestObjectIdPipe)
        apiKey: string
    ): Promise<IResponseReturn<ApiKeyResponseDto>> {
        const updated = await this.apiKeyService.inactive(apiKey);

        return {
            data: updated,
        };
    }

    @ApiKeyAdminActiveDoc()
    @Response('apiKey.active')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    // @UserProtected() // TODO: Resolve this
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:apiKey/active')
    async active(
        @Param('apiKey', RequestRequiredPipe, RequestObjectIdPipe)
        apiKey: string
    ): Promise<IResponseReturn<ApiKeyResponseDto>> {
        const updated = await this.apiKeyService.active(apiKey);

        return {
            data: updated,
        };
    }

    @ApiKeyAdminDeleteDoc()
    @Response('apiKey.delete')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.DELETE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    // @UserProtected() // TODO: Resolve this
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/delete/:apiKey')
    async delete(
        @Param('apiKey', RequestRequiredPipe, RequestObjectIdPipe)
        apiKey: string
    ): Promise<IResponseReturn<ApiKeyResponseDto>> {
        const deleted = await this.apiKeyService.delete(apiKey);

        return {
            data: deleted,
        };
    }
}
