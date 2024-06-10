import { applyDecorators } from '@nestjs/common';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/constants/doc.enum.constant';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { UserUpdateMobileNumberDto } from 'src/modules/user/dtos/request/user.update-mobile-number.dto';

export function UserAuthUpdateMobileNumberDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'user update mobile number',
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: UserUpdateMobileNumberDto,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true }),
        DocResponse('user.updateMobileNumber')
    );
}

export function UserUserDeleteSelfDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'user delete their account',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true }),
        DocResponse('user.deleteSelf')
    );
}
