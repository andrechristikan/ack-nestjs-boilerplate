import { ApiProperty } from '@nestjs/swagger';
import { EnumTenantStatus } from '@generated/prisma-client';
import {
    IsEnum,
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
        description: 'Tenant status',
        enum: EnumTenantStatus,
    })
    @IsOptional()
    @IsEnum(EnumTenantStatus)
    status?: EnumTenantStatus;
}
