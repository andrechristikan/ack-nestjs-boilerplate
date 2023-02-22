import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class PermissionRequestDto {
    @ApiProperty({
        name: 'permission',
        description: 'permission id',
        required: true,
        nullable: false,
    })
    @IsNotEmpty()
    @IsUUID('4')
    @Type(() => String)
    permission: string;
}
