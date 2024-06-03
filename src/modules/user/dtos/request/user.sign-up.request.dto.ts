import { OmitType } from '@nestjs/swagger';
import { UserCreateRequestDto } from 'src/modules/user/dtos/request/user.create.request.dto';

export class UserSignUpRequestDto extends OmitType(UserCreateRequestDto, [
    'mobileNumber',
    'mobileNumberCode',
    'role',
] as const) {}
