import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsBoolean } from 'class-validator';

export class RoleActiveDto {
    @ApiProperty({
        name: 'isActive',
        description: 'is active role',
        required: true,
        nullable: false,
    })
    @IsBoolean()
    @IsNotEmpty()
    isActive: boolean;
}
