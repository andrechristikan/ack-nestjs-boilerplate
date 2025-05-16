import {
    ApiHideProperty,
    IntersectionType,
    OmitType,
    PickType,
} from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { UserGetResponseDto } from 'src/modules/user/dtos/response/user.get.response.dto';
import { UserShortResponseDto } from 'src/modules/user/dtos/response/user.short.response.dto';

export class UserCensorResponseDto extends IntersectionType(
    PickType(UserGetResponseDto, ['mobileNumber']),
    OmitType(UserShortResponseDto, ['username', 'email', 'country'])
) {
    @ApiHideProperty()
    @Exclude()
    username: string;

    @ApiHideProperty()
    @Exclude()
    email?: string;

    @ApiHideProperty()
    @Exclude()
    country: string;
}
