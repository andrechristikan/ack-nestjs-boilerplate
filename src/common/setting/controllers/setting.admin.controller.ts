import {
    BadRequestException,
    Body,
    Controller,
    InternalServerErrorException,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthJwtAdminAccessProtected } from 'src/common/auth/decorators/auth.jwt.decorator';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import { RequestParamGuard } from 'src/common/request/decorators/request.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';
import { ENUM_SETTING_STATUS_CODE_ERROR } from 'src/common/setting/constants/setting.status-code.constant';
import { SettingAdminUpdateGuard } from 'src/common/setting/decorators/setting.admin.decorator';
import { GetSetting } from 'src/common/setting/decorators/setting.decorator';
import { SettingUpdateDoc } from 'src/common/setting/docs/setting.admin.doc';
import { SettingRequestDto } from 'src/common/setting/dtos/setting.request.dto';
import { SettingUpdateValueDto } from 'src/common/setting/dtos/setting.update-value.dto';
import { SettingDoc } from 'src/common/setting/repository/entities/setting.entity';
import { SettingService } from 'src/common/setting/services/setting.service';

@ApiTags('admin.setting')
@Controller({
    version: '1',
    path: '/setting',
})
export class SettingAdminController {
    constructor(private readonly settingService: SettingService) {}

    @SettingUpdateDoc()
    @Response('setting.update', {
        serialization: ResponseIdSerialization,
    })
    @SettingAdminUpdateGuard()
    @RequestParamGuard(SettingRequestDto)
    @AuthJwtAdminAccessProtected()
    @Put('/update/:setting')
    async update(
        @GetSetting() setting: SettingDoc,
        @Body()
        body: SettingUpdateValueDto
    ): Promise<IResponse> {
        const check = await this.settingService.checkValue(
            body.value,
            body.type
        );
        if (!check) {
            throw new BadRequestException({
                statusCode:
                    ENUM_SETTING_STATUS_CODE_ERROR.SETTING_VALUE_NOT_ALLOWED_ERROR,
                message: 'setting.error.valueNotAllowed',
            });
        }

        try {
            await this.settingService.updateValue(setting, body);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }

        return {
            data: { _id: setting._id },
        };
    }
}
