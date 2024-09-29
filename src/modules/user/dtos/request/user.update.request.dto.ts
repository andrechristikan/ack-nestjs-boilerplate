import { OmitType } from '@nestjs/swagger';
import { UserCreateRequestDto } from 'src/modules/user/dtos/request/user.create.request.dto';

export class UserUpdateRequestDto extends OmitType(UserCreateRequestDto, [
    'email',
] as const) {}
