import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import { Response } from '@common/response/decorators/response.decorator';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
} from '@generated/prisma-client/client';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';
import {
    PolicyAdminCreateDoc,
    PolicyAdminDeleteDoc,
    PolicyAdminListDoc,
    PolicyAdminUpdateDoc,
} from '@modules/policy/docs/policy.admin.doc';
import { PolicySchema } from '@modules/policy/dtos/policy.dto';
import type { PolicyDto } from '@modules/policy/dtos/policy.dto';
import { PolicyRequestSchema } from '@modules/policy/dtos/request/policy.request.dto';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import { PolicyUpdateRequestSchema } from '@modules/policy/dtos/request/policy.update.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import { PolicyListResponseSchema } from '@modules/policy/dtos/response/policy.list.response.dto';
import type { PolicyListResponseDto } from '@modules/policy/dtos/response/policy.list.response.dto';
import { PolicyHttpService } from '@modules/policy/services/policy.http.service';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.admin.role.policy')
@Controller({
    version: '1',
    path: '/role/:roleId/policy',
})
export class PolicyAdminController {
    constructor(private readonly policyHttpService: PolicyHttpService) {}

    @PolicyAdminListDoc()
    @Response('policy.listByRole', { schema: PolicyListResponseSchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.role,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/list')
    async list(
        @Param('roleId', { schema: RequestUuidSchema })
        roleId: string
    ): Promise<IResponseReturn<PolicyListResponseDto>> {
        return this.policyHttpService.listByRole(roleId);
    }

    @PolicyAdminCreateDoc()
    @Response('policy.create', { schema: PolicySchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.role,
        action: [EnumPolicyAction.read, EnumPolicyAction.create],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Post('/create')
    async create(
        @Param('roleId', { schema: RequestUuidSchema })
        roleId: string,
        @Body({ schema: PolicyRequestSchema })
        body: PolicyRequestDto
    ): Promise<IResponseReturn<PolicyDto>> {
        return this.policyHttpService.createByAdmin(roleId, body);
    }

    @PolicyAdminUpdateDoc()
    @Response('policy.update', { schema: PolicySchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.role,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Put('/update/:policyId')
    async update(
        @Param('roleId', { schema: RequestUuidSchema })
        roleId: string,
        @Param('policyId', { schema: RequestUuidSchema })
        policyId: string,
        @Body({ schema: PolicyUpdateRequestSchema })
        body: PolicyUpdateRequestDto
    ): Promise<IResponseReturn<PolicyDto>> {
        return this.policyHttpService.updateByAdmin(roleId, policyId, body);
    }

    @PolicyAdminDeleteDoc()
    @Response('policy.delete')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.role,
        action: [EnumPolicyAction.read, EnumPolicyAction.delete],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Delete('/delete/:policyId')
    async delete(
        @Param('roleId', { schema: RequestUuidSchema })
        roleId: string,
        @Param('policyId', { schema: RequestUuidSchema })
        policyId: string
    ): Promise<IResponseReturn<void>> {
        return this.policyHttpService.deleteByAdmin(roleId, policyId);
    }
}
