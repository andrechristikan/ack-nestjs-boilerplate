import { PickType } from '@nestjs/swagger';
import { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import { UserClaimUsernameRequestDto } from '@modules/user/dtos/request/user.claim-username.request.dto';

export class UserCheckUsernameRequestDto extends UserClaimUsernameRequestDto {}

export class UserCheckEmailRequestDto extends PickType(UserCreateRequestDto, [
    'email',
] as const) {}
