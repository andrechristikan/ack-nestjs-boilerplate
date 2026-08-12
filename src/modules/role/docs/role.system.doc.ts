import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { RoleDocParamsId } from '@modules/role/constants/role.doc.constant';
import { RoleAbilitiesResponseDto } from '@modules/role/dtos/response/role.abilities.response.dto';
import { applyDecorators } from '@nestjs/common';

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
