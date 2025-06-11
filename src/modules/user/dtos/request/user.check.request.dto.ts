import { PickType } from '@nestjs/swagger';
import { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import { UserUpdateClaimUsernameRequestDto } from '@modules/user/dtos/request/user.update-claim-username.dto';

export class UserCheckUsernameRequestDto extends UserUpdateClaimUsernameRequestDto {}

export class UserCheckEmailRequestDto extends PickType(UserCreateRequestDto, [
    'email',
] as const) {}
