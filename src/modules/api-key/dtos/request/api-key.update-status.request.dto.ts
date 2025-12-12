import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ApiKeyUpdateStatusRequestDto {
    @ApiProperty({
        example: true,
        required: true,
        description: 'API Key status',
    })
    @IsNotEmpty()
    @IsBoolean()
    isActive: boolean;
}
