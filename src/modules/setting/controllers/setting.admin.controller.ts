import { BadRequestException, Body, Controller, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeyPublicProtected } from 'src/common/api-key/decorators/api-key.decorator';
import { AuthJwtAdminAccessProtected } from 'src/common/auth/decorators/auth.jwt.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from 'src/common/policy/constants/policy.enum.constant';
import { PolicyAbilityProtected } from 'src/common/policy/decorators/policy.decorator';
import { RequestParamGuard } from 'src/common/request/decorators/request.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';
import { ENUM_SETTING_STATUS_CODE_ERROR } from 'src/modules/setting/constants/setting.status-code.constant';
import { SettingAdminUpdateGuard } from 'src/modules/setting/decorators/setting.admin.decorator';
import { GetSetting } from 'src/modules/setting/decorators/setting.decorator';
import { SettingAdminUpdateDoc } from 'src/modules/setting/docs/setting.admin.doc';
import { SettingRequestDto } from 'src/modules/setting/dtos/setting.request.dto';
import { SettingUpdateValueDto } from 'src/modules/setting/dtos/setting.update-value.dto';
import { SettingDoc } from 'src/modules/setting/repository/entities/setting.entity';
import { SettingService } from 'src/modules/setting/services/setting.service';

@ApiTags('modules.admin.setting')
@Controller({
    version: '1',
    path: '/setting',
})
export class SettingAdminController {
    constructor(private readonly settingService: SettingService) {}

    @SettingAdminUpdateDoc()
    @Response('setting.update', {
        serialization: ResponseIdSerialization,
    })
    @SettingAdminUpdateGuard()
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SETTING,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @AuthJwtAdminAccessProtected()
    @ApiKeyPublicProtected()
    @RequestParamGuard(SettingRequestDto)
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

        await this.settingService.updateValue(setting, body);

        return {
            data: { _id: setting._id },
        };
    }
}
