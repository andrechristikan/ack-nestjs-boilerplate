import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { RoleDocQueryList } from '@modules/role/constants/role.doc.constant';
import {
    RoleDefaultAvailableOrderBy,
    RoleDefaultAvailableSearch,
} from '@modules/role/constants/role.list.constant';
import {
    RoleListResponseDto,
    RoleListResponseSchema,
} from '@modules/role/dtos/response/role.list.response.dto';
import { applyDecorators } from '@nestjs/common';

export function RoleSystemListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get list of roles',
        }),
        DocRequest({
            queries: RoleDocQueryList,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponsePaging<RoleListResponseDto>('role.list', {
            schema: RoleListResponseSchema,
            availableSearch: RoleDefaultAvailableSearch,
            availableOrderBy: RoleDefaultAvailableOrderBy,
            type: EnumPaginationType.cursor,
        })
    );
}
