import { applyDecorators } from '@nestjs/common';
import { DocAuth } from 'src/common/doc/decorators/doc.decorator';
import { Doc, DocResponse } from 'src/common/doc/decorators/doc.decorator';
import { SettingCoreResponseDto } from 'src/modules/setting/dtos/response/setting.core.response.dto';

export function SettingPublicCoreDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get core' }),
        DocResponse<SettingCoreResponseDto>('setting.core', {
            dto: SettingCoreResponseDto,
        }),
        DocAuth({ xApiKey: true })
    );
}
