import { PickType } from '@nestjs/swagger';
import { UserCreateRequestDto } from 'src/modules/user/dtos/request/user.create.request.dto';

export class UserUpdateRequestDto extends PickType(UserCreateRequestDto, [
    'name',
    'country',
    'role',
] as const) {}
