import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, ValidateNested } from 'class-validator';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';

export class UserUpdateAbilitiesRequestDto {
    @ApiProperty({
        description: 'Complete list of abilities to set for the user',
        type: [RoleAbilityRequestDto],
        isArray: true,
        example: [
            {
                subject: 'user',
                action: ['read', 'update'],
            },
            {
                subject: 'session',
                action: ['read'],
            },
        ],
    })
    @Type(() => RoleAbilityRequestDto)
    @IsArray()
    @IsNotEmpty()
    @ValidateNested({ each: true })
    abilities: RoleAbilityRequestDto[];
}
