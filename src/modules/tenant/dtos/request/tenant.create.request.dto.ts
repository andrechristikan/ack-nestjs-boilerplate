import { ApiProperty } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class TenantCreateRequestDto {
    @ApiProperty({
        required: true,
        description: 'Tenant name',
        example: 'Acme Travel Group',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @ApiProperty({
        required: false,
        description: 'Tenant description',
        example: 'Default workspace for ACME',
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;
}
