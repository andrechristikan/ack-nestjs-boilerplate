import { RoleDto } from '@modules/role/dtos/role.dto';
import { PickType } from '@nestjs/swagger';

export class RoleAbilitiesResponseDto extends PickType(RoleDto, [
    'abilities',
]) {}
