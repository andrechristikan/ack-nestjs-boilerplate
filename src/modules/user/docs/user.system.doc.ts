import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import {
    UserDocQueryCountry,
    UserDocQueryRoleType,
    UserDocQueryStatus,
} from 'src/modules/user/constants/user.doc.constant';
import {
    UserCheckEmailRequestDto,
    UserCheckUsernameRequestDto,
} from 'src/modules/user/dtos/request/user.check.request.dto';
import { UserCheckResponseDto } from 'src/modules/user/dtos/response/user.check.response.dto';
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

export function UserSystemCheckUsernameDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'check user exist by username',
        }),
        DocRequest({
            dto: UserCheckUsernameRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse<UserCheckResponseDto>('user.checkUsername', {
            dto: UserCheckResponseDto,
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
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse<UserCheckResponseDto>('user.checkEmail', {
            dto: UserCheckResponseDto,
        })
    );
}
