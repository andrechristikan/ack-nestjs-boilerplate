import { UserCreateDto } from 'src/modules/user/dtos/user.create.dto';
import {InputType, PickType} from "@nestjs/graphql";

@InputType()
export class UserLoginInput extends PickType(UserCreateDto, [
    'email',
    'password',
] as const) {}