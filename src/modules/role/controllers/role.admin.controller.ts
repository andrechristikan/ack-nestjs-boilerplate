import { Body, Controller, Delete, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import { Response } from '@common/response/decorators/response.decorator';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '@modules/policy/enums/policy.enum';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from '@modules/policy/decorators/policy.decorator';
import { RoleService } from '@modules/role/services/role.service';
import {
    RoleAdminCreateDoc,
    RoleAdminDeleteDoc,
    RoleAdminUpdateDoc,
} from '@modules/role/docs/role.admin.doc';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { RoleResponseDto } from '@modules/role/dtos/response/role.response.dto';
import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import { RequestIsValidObjectIdPipe } from '@common/request/pipes/request.is-valid-object-id.pipe';

@ApiTags('modules.admin.role')
@Controller({
    version: '1',
    path: '/role',
})
export class RoleAdminController {
    constructor(private readonly roleService: RoleService) {}

    @RoleAdminCreateDoc()
    @Response('role.create')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.ROLE,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.CREATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    // @UserProtected(). // TODO: Resolve this
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/create')
    async create(
        @Body()
        body: RoleCreateRequestDto
    ): Promise<IResponseReturn<RoleResponseDto>> {
        const data = await this.roleService.create(body);

        return {
            data,
        };
    }

    @RoleAdminUpdateDoc()
    @Response('role.update')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.ROLE,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    // @UserProtected(). // TODO: Resolve this
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:roleId')
    async update(
        @Param('roleId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        roleId: string,
        @Body()
        body: RoleUpdateRequestDto
    ): Promise<IResponseReturn<RoleResponseDto>> {
        const data = await this.roleService.update(roleId, body);

        return {
            data,
        };
    }

    // TODO: RESOLVE THIS AFTER USER MODULE IS READY
    @RoleAdminDeleteDoc()
    @Response('role.delete')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.ROLE,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.DELETE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    // @UserProtected(). // TODO: Resolve this
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/delete/:roleId')
    async delete(
        @Param('roleId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        roleId: string
    ): Promise<void> {
        await this.roleService.delete(roleId);

        return;
    }
}
