import { HttpStatus, applyDecorators } from '@nestjs/common';
import { DocAuth, DocDefault } from 'src/common/doc/decorators/doc.decorator';
import {
    Doc,
    DocErrorGroup,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { SettingDocParamsId } from 'src/modules/setting/constants/setting.doc.constant';
import { ENUM_SETTING_STATUS_CODE_ERROR } from 'src/modules/setting/constants/setting.status-code.constant';
import { SettingGetSerialization } from 'src/modules/setting/serializations/setting.get.serialization';
import { SettingLanguageSerialization } from 'src/modules/setting/serializations/setting.language.serialization';
import { SettingListSerialization } from 'src/modules/setting/serializations/setting.list.serialization';

export function SettingPublicListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get list of settings',
        }),
        DocAuth({ apiKey: true }),
        DocResponsePaging<SettingListSerialization>('setting.list', {
            serialization: SettingListSerialization,
        })
    );
}

export function SettingPublicGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get detail a setting' }),
        DocRequest({
            params: SettingDocParamsId,
        }),
        DocResponse<SettingGetSerialization>('setting.get', {
            serialization: SettingGetSerialization,
        }),
        DocAuth({ apiKey: true }),
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

export function SettingPublicLanguageDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get all language of app' }),
        DocAuth({ apiKey: true }),
        DocResponse<SettingLanguageSerialization>('setting.languages', {
            serialization: SettingLanguageSerialization,
        })
    );
}
