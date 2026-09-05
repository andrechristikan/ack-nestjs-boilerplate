import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import {
    UserCheckEmailResponseDto,
    UserCheckEmailResponseSchema,
    UserCheckUsernameResponseDto,
    UserCheckUsernameResponseSchema,
} from '@modules/user/dtos/response/user.check.response.dto';
import { applyDecorators } from '@nestjs/common';

export function UserSystemCheckUsernameDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'check user exist by username',
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse<UserCheckUsernameResponseDto>('user.checkUsername', {
            schema: UserCheckUsernameResponseSchema,
        })
    );
}

export function UserSystemCheckEmailDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'check user exist by email',
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse<UserCheckEmailResponseDto>('user.checkEmail', {
            schema: UserCheckEmailResponseSchema,
        })
    );
}
