import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@common/doc/enums/doc.enum';
import { RoleDocParamsId } from '@modules/role/constants/role.doc.constant';
import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import { RoleDto } from '@modules/role/dtos/role.dto';
import { HttpStatus, applyDecorators } from '@nestjs/common';

export function RoleAdminCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create a role',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: RoleCreateRequestDto,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<RoleDto>('role.create', {
            httpStatus: HttpStatus.CREATED,
            dto: RoleDto,
        })
    );
}

export function RoleAdminUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update data a role',
        }),
        DocRequest({
            params: RoleDocParamsId,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: RoleUpdateRequestDto,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<RoleDto>('role.update', {
            dto: RoleDto,
        })
    );
}

export function RoleAdminDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'delete data a role',
        }),
        DocRequest({
            params: RoleDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse('role.delete')
    );
}
