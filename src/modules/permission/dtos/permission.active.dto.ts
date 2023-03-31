import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsBoolean } from 'class-validator';

export class PermissionActiveDto {
    @ApiProperty({
        name: 'isActive',
        description: 'is active permission',
        required: true,
        nullable: false,
    })
    @IsBoolean()
    @IsNotEmpty()
    isActive: boolean;
}
