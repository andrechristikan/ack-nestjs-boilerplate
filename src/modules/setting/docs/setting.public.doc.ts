import { applyDecorators } from '@nestjs/common';
import { DocAuth } from 'src/common/doc/decorators/doc.decorator';
import { Doc, DocResponse } from 'src/common/doc/decorators/doc.decorator';
import { SettingCoreSerialization } from 'src/modules/setting/serializations/setting.core.serialization';

export function SettingPublicCoreDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get core' }),
        DocResponse<SettingCoreSerialization>('setting.core', {
            serialization: SettingCoreSerialization,
        }),
        DocAuth({ apiKey: true })
    );
}
