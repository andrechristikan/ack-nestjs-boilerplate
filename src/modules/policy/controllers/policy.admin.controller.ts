import { Doc } from '@common/doc/decorators/doc.decorator';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import { Response } from '@common/response/decorators/response.decorator';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { PlatformPolicyProtected } from '@modules/policy/decorators/policy.decorator';
import { PolicySchema } from '@modules/policy/dtos/policy.dto';
import type { PolicyDto } from '@modules/policy/dtos/policy.dto';
import { PolicyCreateRequestSchema } from '@modules/policy/dtos/request/policy.create.request.dto';
import type { PolicyCreateRequestDto } from '@modules/policy/dtos/request/policy.create.request.dto';
import { PolicyUpdateRequestSchema } from '@modules/policy/dtos/request/policy.update.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import { PolicyListResponseSchema } from '@modules/policy/dtos/response/policy.list.response.dto';
import type { PolicyListResponseDto } from '@modules/policy/dtos/response/policy.list.response.dto';
import { PolicyHttpService } from '@modules/policy/services/policy.http.service';
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

    @Doc({ summary: 'get all policies granted by a role' })
    @Response('policy.listByRole', { schema: PolicyListResponseSchema })
    @TermPolicyAcceptanceProtected()
    @PlatformPolicyProtected({
        subject: EnumPolicySubject.Role,
        action: [EnumPolicyAction.read],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/list')
    async list(
        @Param('roleId', { schema: RequestUuidSchema })
        roleId: string
    ): Promise<IResponseReturn<PolicyListResponseDto>> {
        return this.policyHttpService.listByAdmin(roleId);
    }

    @Doc({ summary: 'grant a rule to a role' })
    @Response('policy.create', { schema: PolicySchema })
    @TermPolicyAcceptanceProtected()
    @PlatformPolicyProtected({
        subject: EnumPolicySubject.Role,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Post('/create')
    async create(
        @Param('roleId', { schema: RequestUuidSchema })
        roleId: string,
        @Body({ schema: PolicyCreateRequestSchema })
        body: PolicyCreateRequestDto
    ): Promise<IResponseReturn<PolicyDto>> {
        return this.policyHttpService.createByAdmin(roleId, body);
    }

    @Doc({ summary: 'update the full rule of a role policy' })
    @Response('policy.update', { schema: PolicySchema })
    @TermPolicyAcceptanceProtected()
    @PlatformPolicyProtected({
        subject: EnumPolicySubject.Role,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
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

    @Doc({ summary: 'revoke a policy from a role' })
    @Response('policy.delete')
    @TermPolicyAcceptanceProtected()
    @PlatformPolicyProtected({
        subject: EnumPolicySubject.Role,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
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
