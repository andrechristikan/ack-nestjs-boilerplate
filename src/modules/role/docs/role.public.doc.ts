import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import {
    RoleDocParamsId,
    RoleDocQueryList,
} from '@modules/role/constants/role.doc.constant';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleResponseDto } from '@modules/role/dtos/response/role.response.dto';
import { applyDecorators } from '@nestjs/common';

export function RolePublicListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all of roles',
        }),
        DocRequest({
            queries: RoleDocQueryList,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponsePaging<RoleListResponseDto>('role.list', {
            dto: RoleListResponseDto,
        })
    );
}

export function RolePublicGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get detail a role',
        }),
        DocRequest({
            params: RoleDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse<RoleResponseDto>('role.get', {
            dto: RoleResponseDto,
        })
    );
}
