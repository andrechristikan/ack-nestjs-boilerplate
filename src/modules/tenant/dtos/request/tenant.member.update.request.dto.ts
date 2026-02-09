import { ApiProperty } from '@nestjs/swagger';
import { EnumTenantMemberStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TenantMemberUpdateRequestDto {
    @ApiProperty({
        required: false,
        description: 'Role name',
        example: 'tenant-admin',
    })
    @IsString()
    @IsOptional()
    @IsNotEmpty()
    roleName?: string;

    @ApiProperty({
        required: false,
        description: 'Tenant member status',
        enum: EnumTenantMemberStatus,
    })
    @IsOptional()
    @IsEnum(EnumTenantMemberStatus)
    status?: EnumTenantMemberStatus;
}
