import { Doc, DocErrors } from '@common/doc/decorators/doc.decorator';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { RequestMongoIdSchema } from '@common/request/validations/request.mongo-id.validation';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
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
import { PolicySchema } from '@modules/policy/dtos/policy.dto';
import type { PolicyDto } from '@modules/policy/dtos/policy.dto';
import { PolicyRequestSchema } from '@modules/policy/dtos/request/policy.request.dto';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import { PolicyUpdateRequestSchema } from '@modules/policy/dtos/request/policy.update.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import { PolicyListResponseSchema } from '@modules/policy/dtos/response/policy.list.response.dto';
import type { PolicyListResponseDto } from '@modules/policy/dtos/response/policy.list.response.dto';
import { PolicyHttpService } from '@modules/policy/services/http/policy.http.service';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import {
    UserCurrent,
    UserProtected,
} from '@modules/user/decorators/user.decorator';
import type { IUser } from '@modules/user/interfaces/user.interface';
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpStatus,
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
        @Param('roleId', { schema: RequestMongoIdSchema })
        roleId: string
    ): Promise<IResponseReturn<PolicyListResponseDto>> {
        return this.policyHttpService.listByRole(roleId);
    }

    @Doc({ summary: 'grant a policy to a role' })
    @Response('policy.create', { schema: PolicySchema })
    @DocErrors(HttpStatus.FORBIDDEN, {
        statusCode: EnumRoleStatusCodeError.rankForbidden,
        messagePath: 'role.error.rankForbidden',
    })
    @DocErrors(HttpStatus.FORBIDDEN, {
        statusCode: EnumRoleStatusCodeError.selfForbidden,
        messagePath: 'role.error.selfForbidden',
    })
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
        @Param('roleId', { schema: RequestMongoIdSchema })
        roleId: string,
        @Body({ schema: PolicyRequestSchema })
        body: PolicyRequestDto,
        @UserCurrent() user: IUser
    ): Promise<IResponseReturn<PolicyDto>> {
        return this.policyHttpService.createByAdmin(roleId, body, user);
    }

    @Doc({ summary: 'update the action list of a role policy' })
    @Response('policy.update', { schema: PolicySchema })
    @DocErrors(HttpStatus.FORBIDDEN, {
        statusCode: EnumRoleStatusCodeError.rankForbidden,
        messagePath: 'role.error.rankForbidden',
    })
    @DocErrors(HttpStatus.FORBIDDEN, {
        statusCode: EnumRoleStatusCodeError.selfForbidden,
        messagePath: 'role.error.selfForbidden',
    })
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
        @Param('roleId', { schema: RequestMongoIdSchema })
        roleId: string,
        @Param('policyId', { schema: RequestMongoIdSchema })
        policyId: string,
        @Body({ schema: PolicyUpdateRequestSchema })
        body: PolicyUpdateRequestDto,
        @UserCurrent() user: IUser
    ): Promise<IResponseReturn<PolicyDto>> {
        return this.policyHttpService.updateByAdmin(
            roleId,
            policyId,
            body,
            user
        );
    }

    @Doc({ summary: 'revoke a policy from a role' })
    @Response('policy.delete')
    @DocErrors(HttpStatus.FORBIDDEN, {
        statusCode: EnumRoleStatusCodeError.rankForbidden,
        messagePath: 'role.error.rankForbidden',
    })
    @DocErrors(HttpStatus.FORBIDDEN, {
        statusCode: EnumRoleStatusCodeError.selfForbidden,
        messagePath: 'role.error.selfForbidden',
    })
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
        @Param('roleId', { schema: RequestMongoIdSchema })
        roleId: string,
        @Param('policyId', { schema: RequestMongoIdSchema })
        policyId: string,
        @UserCurrent() user: IUser
    ): Promise<IResponseReturn<void>> {
        return this.policyHttpService.deleteByAdmin(roleId, policyId, user);
    }
}
