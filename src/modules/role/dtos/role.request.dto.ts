import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class RoleRequestDto {
    @ApiProperty({
        name: 'role',
        description: 'role id',
        required: true,
        nullable: false,
    })
    @IsNotEmpty()
    @IsUUID('4')
    @Type(() => String)
    role: string;
}
