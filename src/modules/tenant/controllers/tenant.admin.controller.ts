import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { PaginationOffsetQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { ActivityLog } from '@modules/activity-log/decorators/activity-log.decorator';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { PolicyAbilityProtected } from '@modules/policy/decorators/policy.decorator';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';
import { TenantCreateRequestDto } from '@modules/tenant/dtos/request/tenant.create.request.dto';
import { TenantJitAccessRequestDto } from '@modules/tenant/dtos/request/tenant.jit-access.request.dto';
import { TenantUpdateRequestDto } from '@modules/tenant/dtos/request/tenant.update.request.dto';
import { TenantJitAccessResponseDto } from '@modules/tenant/dtos/response/tenant.jit-access.response.dto';
import { TenantResponseDto } from '@modules/tenant/dtos/response/tenant.response.dto';
import {
    TenantAdminAssumeAccessDoc,
    TenantAdminCreateDoc,
    TenantAdminDeleteDoc,
    TenantAdminGetDoc,
    TenantAdminListDoc,
    TenantAdminRevokeAccessDoc,
    TenantAdminUpdateDoc,
} from '@modules/tenant/docs/tenant.admin.doc';
import { TenantMemberService } from '@modules/tenant/services/tenant-member.service';
import { TenantService } from '@modules/tenant/services/tenant.service';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EnumActivityLogAction } from '@prisma/client';

@ApiTags('modules.admin.tenant')
@Controller({
    version: '1',
    path: '/tenants',
})
export class TenantAdminController {
    constructor(
        private readonly tenantService: TenantService,
        private readonly tenantMemberService: TenantMemberService
    ) {}

    @TenantAdminListDoc()
    @ResponsePaging('tenant.list')
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.tenant,
        action: [EnumPolicyAction.read],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    //@ApiKeyProtected()
    @Get('')
    async list(
        @PaginationOffsetQuery()
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<TenantResponseDto>> {
        return this.tenantService.getListOffset(pagination);
    }

    @TenantAdminCreateDoc()
    @Response('tenant.create')
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.tenant,
        action: [EnumPolicyAction.create],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('')
    async create(
        @Body() body: TenantCreateRequestDto,
        @AuthJwtPayload('userId') createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        return this.tenantService.create(body, createdBy);
    }

    @TenantAdminGetDoc()
    @Response('tenant.get')
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.tenant,
        action: [EnumPolicyAction.read],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    //@ApiKeyProtected()
    @Get('/:tenantId')
    async get(
        @Param('tenantId', RequestRequiredPipe)
        tenantId: string
    ): Promise<IResponseReturn<TenantResponseDto>> {
        return this.tenantService.getOne(tenantId);
    }

    @TenantAdminUpdateDoc()
    @Response('tenant.update')
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.tenant,
        action: [EnumPolicyAction.update],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/:tenantId')
    async update(
        @Param('tenantId', RequestRequiredPipe)
        tenantId: string,
        @Body() body: TenantUpdateRequestDto,
        @AuthJwtPayload('userId') updatedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.tenantService.update(tenantId, body, updatedBy);
    }

    @TenantAdminDeleteDoc()
    @Response('tenant.delete')
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.tenant,
        action: [EnumPolicyAction.delete],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/:tenantId')
    async delete(
        @Param('tenantId', RequestRequiredPipe)
        tenantId: string,
        @AuthJwtPayload('userId') deletedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.tenantService.delete(tenantId, deletedBy);
    }

    @TenantAdminAssumeAccessDoc()
    @Response('tenant.assumeAccess')
    @ActivityLog(EnumActivityLogAction.tenantJitAccessAssumed)
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.tenant,
        action: [EnumPolicyAction.update],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @Post('/:tenantId/assume-access')
    async assumeAccess(
        @Param('tenantId', RequestRequiredPipe)
        tenantId: string,
        @Body() body: TenantJitAccessRequestDto,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponseReturn<TenantJitAccessResponseDto>> {
        return this.tenantMemberService.assumeAccess(tenantId, userId, body);
    }

    @TenantAdminRevokeAccessDoc()
    @Response('tenant.revokeAccess')
    @ActivityLog(EnumActivityLogAction.tenantJitAccessRevoked)
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.tenant,
        action: [EnumPolicyAction.delete],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @Delete('/:tenantId/revoke-access')
    async revokeAccess(
        @Param('tenantId', RequestRequiredPipe)
        tenantId: string,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponseReturn<void>> {
        return this.tenantMemberService.revokeJitAccess(tenantId, userId);
    }
}
