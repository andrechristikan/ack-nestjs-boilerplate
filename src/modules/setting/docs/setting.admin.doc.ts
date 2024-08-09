import { HttpStatus, applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocDefault,
    DocErrorGroup,
    DocRequest,
    DocGuard,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import { SettingDocParamsId } from 'src/modules/setting/constants/setting.doc.constant';
import { ENUM_SETTING_STATUS_CODE_ERROR } from 'src/modules/setting/enums/setting.status-code.enum';
import { SettingUpdateRequestDto } from 'src/modules/setting/dtos/request/setting.update.request.dto';
import { SettingGetResponseDto } from 'src/modules/setting/dtos/response/setting.get.response.dto';
import { SettingListResponseDto } from 'src/modules/setting/dtos/response/setting.list.response.dto';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';

export function SettingAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get list of settings',
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<SettingListResponseDto>('setting.list', {
            dto: SettingListResponseDto,
        })
    );
}

export function SettingAdminGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get detail a setting' }),
        DocRequest({
            params: SettingDocParamsId,
        }),
        DocResponse<SettingGetResponseDto>('setting.get', {
            dto: SettingGetResponseDto,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true }),
        DocErrorGroup([
            DocDefault({
                httpStatus: HttpStatus.NOT_FOUND,
                statusCode: ENUM_SETTING_STATUS_CODE_ERROR.NOT_FOUND,
                messagePath: 'setting.error.notFound',
            }),
        ])
    );
}

export function SettingAdminUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'update a setting' }),
        DocRequest({
            params: SettingDocParamsId,
            dto: SettingUpdateRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({
            jwtAccessToken: true,
            xApiKey: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<DatabaseIdResponseDto>('setting.update', {
            dto: DatabaseIdResponseDto,
        }),
        DocErrorGroup([
            DocDefault({
                httpStatus: HttpStatus.NOT_FOUND,
                statusCode: ENUM_SETTING_STATUS_CODE_ERROR.NOT_FOUND,
                messagePath: 'setting.error.notFound',
            }),
            DocDefault({
                httpStatus: HttpStatus.BAD_REQUEST,
                statusCode: ENUM_SETTING_STATUS_CODE_ERROR.VALUE_NOT_ALLOWED,
                messagePath: 'setting.error.valueNotAllowed',
            }),
        ])
    );
}
