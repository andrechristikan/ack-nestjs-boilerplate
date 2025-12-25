import { ApiProperty } from '@nestjs/swagger';
import { RoleAbilityDto } from '@modules/role/dtos/role.ability.dto';

export class UserAbilitiesResponseDto {
    @ApiProperty({
        description: 'User ID',
        example: '507f1f77bcf86cd799439011',
    })
    userId: string;

    @ApiProperty({
        description: 'User abilities',
        type: [RoleAbilityDto],
        isArray: true,
    })
    abilities: RoleAbilityDto[];
}
