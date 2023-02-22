import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class UserRequestDto {
    @ApiProperty({
        name: 'user',
        description: 'user id',
        required: true,
        nullable: false,
    })
    @IsNotEmpty()
    @IsUUID('4')
    @Type(() => String)
    user: string;
}
