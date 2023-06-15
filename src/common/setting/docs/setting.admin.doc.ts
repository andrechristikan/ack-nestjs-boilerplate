import { applyDecorators } from '@nestjs/common';
import { ApiKeyDocParamsId } from 'src/common/api-key/constants/api-key.doc';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';

export function SettingAdminUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocRequest({
            params: ApiKeyDocParamsId,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponse<ResponseIdSerialization>('setting.update', {
            serialization: ResponseIdSerialization,
        })
    );
}
