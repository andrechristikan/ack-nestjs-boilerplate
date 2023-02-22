import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ApiKeyResetDto {
    @ApiProperty({
        name: 'hash',
        description: 'hash of api key',
        required: true,
        nullable: false,
    })
    @IsString()
    @IsNotEmpty()
    hash: string;
}
