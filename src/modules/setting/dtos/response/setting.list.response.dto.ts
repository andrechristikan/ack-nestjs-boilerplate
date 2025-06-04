import { ApiHideProperty, OmitType } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { SettingGetResponseDto } from '@modules/setting/dtos/response/setting.get.response.dto';

export class SettingListResponseDto extends OmitType(
    SettingGetResponseDto,
    ['_id', '__v', 'deleted'] as const
) {
    @ApiHideProperty()
    @Exclude()
    _id: string;

    @ApiHideProperty()
    @Exclude()
    __v?: string;

    @ApiHideProperty()
    @Exclude()
    deleted: boolean;
}
