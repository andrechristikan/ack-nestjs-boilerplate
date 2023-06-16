import { HttpStatus, applyDecorators } from '@nestjs/common';
import { DocDefault } from 'src/common/doc/decorators/doc.decorator';
import {
    Doc,
    DocErrorGroup,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { SettingDocParamsId } from 'src/common/setting/constants/setting.doc.constant';
import { ENUM_SETTING_STATUS_CODE_ERROR } from 'src/common/setting/constants/setting.status-code.constant';
import { SettingGetSerialization } from 'src/common/setting/serializations/setting.get.serialization';
import { SettingListSerialization } from 'src/common/setting/serializations/setting.list.serialization';

export function SettingPublicListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            operation: 'common.public.setting',
        }),
        DocResponsePaging<SettingListSerialization>('setting.list', {
            serialization: SettingListSerialization,
        })
    );
}

export function SettingPublicGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ operation: 'common.public.setting' }),
        DocRequest({
            params: SettingDocParamsId,
        }),
        DocResponse<SettingGetSerialization>('setting.get', {
            serialization: SettingGetSerialization,
        }),
        DocErrorGroup([
            DocDefault({
                httpStatus: HttpStatus.NOT_FOUND,
                statusCode:
                    ENUM_SETTING_STATUS_CODE_ERROR.SETTING_NOT_FOUND_ERROR,
                messagePath: 'setting.error.notFound',
            }),
        ])
    );
}
