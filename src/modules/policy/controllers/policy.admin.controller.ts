import { RequestThrottle } from '@common/request/decorators/request.throttler.decorator';
import { RequestIsValidObjectIdPipe } from '@common/request/pipes/request.is-valid-object-id.pipe';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
} from '@generated/prisma-client';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';
import {
    PolicyAdminCreateDoc,
    PolicyAdminDeleteDoc,
    PolicyAdminListDoc,
    PolicyAdminUpdateDoc,
} from '@modules/policy/docs/policy.admin.doc';
import { PolicyDto, PolicySchema } from '@modules/policy/dtos/policy.dto';
import {
    PolicyRequestDto,
    PolicyRequestSchema,
} from '@modules/policy/dtos/request/policy.request.dto';
import {
    PolicyUpdateRequestDto,
    PolicyUpdateRequestSchema,
} from '@modules/policy/dtos/request/policy.update.request.dto';
import {
    PolicyListResponseDto,
    PolicyListResponseSchema,
} from '@modules/policy/dtos/response/policy.list.response.dto';
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
        @Param('roleId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
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
        @Param('roleId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
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
        @Param('roleId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        roleId: string,
        @Param('policyId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
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
        @Param('roleId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        roleId: string,
        @Param('policyId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        policyId: string
    ): Promise<IResponseReturn<void>> {
        return this.policyHttpService.deleteByAdmin(roleId, policyId);
    }
}
