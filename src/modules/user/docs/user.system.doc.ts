import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { UserShortResponseDto } from 'src/modules/user/dtos/response/user.short.response.dto';

export function UserSystemListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all of users',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponsePaging<UserShortResponseDto>('user.list', {
            dto: UserShortResponseDto,
        })
    );
}
