import { ApiProperty } from '@nestjs/swagger';
import {
    IsInt,
    IsNotEmpty,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';

export class TenantJitAccessRequestDto {
    @ApiProperty({
        required: true,
        description: 'Duration of JIT access in hours',
        example: 2,
        minimum: 1,
        maximum: 12,
    })
    @IsInt()
    @Min(1)
    @Max(12)
    @IsNotEmpty()
    durationInHours: number;

    @ApiProperty({
        required: true,
        description: 'Reason for requesting JIT access',
        example: 'Customer support ticket #123',
        maxLength: 500,
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    reason: string;
}
