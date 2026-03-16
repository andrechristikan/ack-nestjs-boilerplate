import { ApiProperty } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class TenantUpdateRequestDto {
    @ApiProperty({
        required: false,
        description: 'Tenant name',
        example: 'Acme Travel Group',
    })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name?: string;

    @ApiProperty({
        required: false,
        description: 'Tenant description',
        example: 'Workspace for finance team',
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;
}
