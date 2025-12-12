import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { UserDocQueryList } from '@modules/user/constants/user.doc.constant';
import {
    UserCheckEmailRequestDto,
    UserCheckUsernameRequestDto,
} from '@modules/user/dtos/request/user.check.request.dto';
import {
    UserCheckEmailResponseDto,
    UserCheckUsernameResponseDto,
} from '@modules/user/dtos/response/user.check.response.dto';
import { UserListResponseDto } from '@modules/user/dtos/response/user.list.response.dto';
import { applyDecorators } from '@nestjs/common';

export function UserSystemListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all of users',
        }),
        DocRequest({
            queries: UserDocQueryList,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponsePaging<UserListResponseDto>('user.list', {
            dto: UserListResponseDto,
            type: EnumPaginationType.cursor,
        })
    );
}

export function UserSystemCheckUsernameDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'check user exist by username',
        }),
        DocRequest({
            dto: UserCheckUsernameRequestDto,
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse<UserCheckUsernameResponseDto>('user.checkUsername', {
            dto: UserCheckUsernameResponseDto,
        })
    );
}

export function UserSystemCheckEmailDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'check user exist by email',
        }),
        DocRequest({
            dto: UserCheckEmailRequestDto,
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse<UserCheckEmailResponseDto>('user.checkEmail', {
            dto: UserCheckEmailResponseDto,
        })
    );
}
