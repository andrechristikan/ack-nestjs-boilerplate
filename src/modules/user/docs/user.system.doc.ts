import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import {
    UserDocQueryCountry,
    UserDocQueryRoleType,
    UserDocQueryStatus,
} from 'src/modules/user/constants/user.doc.constant';
import { UserShortResponseDto } from 'src/modules/user/dtos/response/user.short.response.dto';

export function UserSystemListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all of users',
        }),
        DocRequest({
            queries: [
                ...UserDocQueryStatus,
                ...UserDocQueryRoleType,
                ...UserDocQueryCountry,
            ],
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponsePaging<UserShortResponseDto>('user.list', {
            dto: UserShortResponseDto,
        })
    );
}
