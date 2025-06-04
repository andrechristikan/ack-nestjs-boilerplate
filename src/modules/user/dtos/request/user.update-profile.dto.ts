import { PickType } from '@nestjs/swagger';
import { UserCreateRequestDto } from '@module/user/dtos/request/user.create.request.dto';

export class UserUpdateProfileRequestDto extends PickType(
    UserCreateRequestDto,
    ['name', 'country', 'gender'] as const
) {}
