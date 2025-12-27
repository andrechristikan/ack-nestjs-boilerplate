import { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import { PickType } from '@nestjs/swagger';

export class UserImportRequestDto extends PickType(UserCreateRequestDto, [
    'email',
    'name',
]) {}
