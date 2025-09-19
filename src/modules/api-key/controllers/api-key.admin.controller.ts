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
    PaginationOffsetQuery,
    PaginationQueryFilterEqualBoolean,
    PaginationQueryFilterInEnum,
} from '@common/pagination/decorators/pagination.decorator';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import {
    API_KEY_DEFAULT_AVAILABLE_SEARCH,
    API_KEY_DEFAULT_TYPE,
} from '@modules/api-key/constants/api-key.list.constant';
import { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyUpdateRequestDto } from '@modules/api-key/dtos/request/api-key.update.request.dto';
import { ApiKeyCreateResponseDto } from '@modules/api-key/dtos/response/api-key.create.response.dto';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
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
import {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@modules/policy/enums/policy.enum';
import { PolicyAbilityProtected } from '@modules/policy/decorators/policy.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { ENUM_API_KEY_TYPE, ENUM_ROLE_TYPE } from '@prisma/client';
import { RequestIsValidObjectIdPipe } from '@common/request/pipes/request.is-valid-object-id.pipe';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { ApiKeyDto } from '@modules/api-key/dtos/api-key.dto';
import { RoleProtected } from '@modules/role/decorators/role.decorator';

@ApiTags('modules.admin.apiKey')
@Controller({
    version: '1',
    path: '/api-key',
})
export class ApiKeyAdminController {
    constructor(private readonly apiKeyService: ApiKeyService) {}

    @ApiKeyAdminListDoc()
    @ResponsePaging('apiKey.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @RoleProtected(ENUM_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationOffsetQuery({
            availableSearch: API_KEY_DEFAULT_AVAILABLE_SEARCH,
        })
        pagination: IPaginationQueryOffsetParams,
        @PaginationQueryFilterEqualBoolean('isActive')
        isActive?: Record<string, IPaginationEqual>,
        @PaginationQueryFilterInEnum<ENUM_API_KEY_TYPE>(
            'type',
            API_KEY_DEFAULT_TYPE
        )
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<ApiKeyDto>> {
        return this.apiKeyService.getList(pagination, isActive, type);
    }

    @ApiKeyAdminCreateDoc()
    @Response('apiKey.create')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.CREATE],
    })
    @RoleProtected(ENUM_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/create')
    async create(
        @Body() body: ApiKeyCreateRequestDto
    ): Promise<IResponseReturn<ApiKeyCreateResponseDto>> {
        return this.apiKeyService.create(body);
    }

    @ApiKeyAdminResetDoc()
    @Response('apiKey.reset')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @RoleProtected(ENUM_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:apiKeyId/reset')
    async reset(
        @Param('apiKeyId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        apiKeyId: string
    ): Promise<IResponseReturn<ApiKeyCreateResponseDto>> {
        return this.apiKeyService.reset(apiKeyId);
    }

    @ApiKeyAdminUpdateDoc()
    @Response('apiKey.update')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @RoleProtected(ENUM_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:apiKeyId')
    async update(
        @Body() body: ApiKeyUpdateRequestDto,
        @Param('apiKeyId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        apiKeyId: string
    ): Promise<IResponseReturn<ApiKeyDto>> {
        return this.apiKeyService.update(apiKeyId, body);
    }

    @ApiKeyAdminUpdateDateDoc()
    @Response('apiKey.updateDate')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @RoleProtected(ENUM_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:apiKeyId/date')
    async updateDate(
        @Body() body: ApiKeyUpdateDateRequestDto,
        @Param('apiKeyId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        apiKeyId: string
    ): Promise<IResponseReturn<ApiKeyDto>> {
        return this.apiKeyService.updateDates(apiKeyId, body);
    }

    @ApiKeyAdminInactiveDoc()
    @Response('apiKey.inactive')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @RoleProtected(ENUM_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:apiKeyId/inactive')
    async inactive(
        @Param('apiKeyId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        apiKeyId: string
    ): Promise<IResponseReturn<ApiKeyDto>> {
        return this.apiKeyService.inactive(apiKeyId);
    }

    @ApiKeyAdminActiveDoc()
    @Response('apiKey.active')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @RoleProtected(ENUM_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:apiKeyId/active')
    async active(
        @Param('apiKeyId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        apiKeyId: string
    ): Promise<IResponseReturn<ApiKeyDto>> {
        return this.apiKeyService.active(apiKeyId);
    }

    @ApiKeyAdminDeleteDoc()
    @Response('apiKey.delete')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.API_KEY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.DELETE],
    })
    @RoleProtected(ENUM_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/delete/:apiKeyId')
    async delete(
        @Param('apiKeyId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        apiKeyId: string
    ): Promise<IResponseReturn<ApiKeyDto>> {
        return this.apiKeyService.delete(apiKeyId);
    }
}
