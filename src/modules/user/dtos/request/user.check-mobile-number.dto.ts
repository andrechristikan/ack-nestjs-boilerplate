import { OmitType } from '@nestjs/swagger';
import { UserUpdateMobileNumberRequestDto } from '@module/user/dtos/request/user.update-mobile-number.request.dto';

export class UserCheckMobileNumberRequestDto extends OmitType(
    UserUpdateMobileNumberRequestDto,
    ['country'] as const
) {}
