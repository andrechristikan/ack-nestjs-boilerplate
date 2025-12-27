import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import {
    RoleDocParamsId,
    RoleDocQueryList,
} from '@modules/role/constants/role.doc.constant';
import { RoleAbilitiesResponseDto } from '@modules/role/dtos/response/role.abilities.response.dto';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { applyDecorators } from '@nestjs/common';

export function RoleSystemListDoc(): MethodDecorator {
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
            type: EnumPaginationType.cursor,
        })
    );
}

export function RoleSystemGetAbilitiesDoc(): MethodDecorator {
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
        DocResponse<RoleAbilitiesResponseDto>('role.getAbilities', {
            dto: RoleAbilitiesResponseDto,
        })
    );
}
