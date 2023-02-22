import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class ApiKeyRequestDto {
    @ApiProperty({
        name: 'apiKey',
        description: 'apiKey id',
        required: true,
        nullable: false,
    })
    @IsNotEmpty()
    @IsUUID('4')
    @Type(() => String)
    apiKey: string;
}
