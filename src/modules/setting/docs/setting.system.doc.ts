import { applyDecorators } from '@nestjs/common';
import { DocAuth } from '@common/doc/decorators/doc.decorator';
import { Doc, DocResponse } from '@common/doc/decorators/doc.decorator';
import { SettingCoreResponseDto } from '@module/setting/dtos/response/setting.core.response.dto';

export function SettingSystemCoreDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get core' }),
        DocAuth({ xApiKey: true }),
        DocResponse<SettingCoreResponseDto>('setting.core', {
            dto: SettingCoreResponseDto,
        })
    );
}
