import { applyDecorators } from '@nestjs/common';
import {
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { Doc } from '@common/doc/decorators/doc.decorator';
import { CountryResponseDto } from '@modules/country/dtos/response/country.response.dto';
import { COUNTRY_DEFAULT_AVAILABLE_SEARCH } from '@modules/country/constants/country.list.constant';
import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@common/doc/enums/doc.enum';
import { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';

export function UserPublicLoginWithCredentialDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'User login with credentials' }),
        DocRequest({
            dto: UserLoginRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse<AuthTokenResponseDto>('user.loginWithCredential', {
            dto: AuthTokenResponseDto,
        })
    );
}
