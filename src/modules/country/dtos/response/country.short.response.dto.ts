import { ApiHideProperty, OmitType } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { CountryListResponseDto } from 'src/modules/country/dtos/response/country.list.response.dto';

export class CountryShortResponseDto extends OmitType(CountryListResponseDto, [
    'createdAt',
    'updatedAt',
]) {
    @ApiHideProperty()
    @Exclude()
    readonly createdAt: Date;

    @ApiHideProperty()
    @Exclude()
    readonly updatedAt: Date;
}
