import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import {
    RoleDocQueryActiveList,
    RoleDocQueryList,
} from '@modules/role/constants/role.doc.constant';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { applyDecorators } from '@nestjs/common';

export function RoleSystemListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all of roles',
        }),
        DocRequest({
            queries: RoleDocQueryActiveList,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponsePaging<RoleListResponseDto>('role.list', {
            dto: RoleListResponseDto,
        })
    );
}
