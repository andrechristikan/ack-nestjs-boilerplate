import { ApiProperty } from '@nestjs/swagger';
import { EnumTenantMemberStatus } from '@prisma/client';
import {
    IsEnum,
    IsMongoId,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';

export class TenantMemberUpdateRequestDto {
    @ApiProperty({
        required: false,
        description: 'Role id',
        example: '65f3d2e44b9a7e1bd2c9a8f1',
    })
    @IsString()
    @IsOptional()
    @IsNotEmpty()
    @IsMongoId()
    roleId?: string;

    @ApiProperty({
        required: false,
        description: 'Tenant member status',
        enum: EnumTenantMemberStatus,
    })
    @IsOptional()
    @IsEnum(EnumTenantMemberStatus)
    status?: EnumTenantMemberStatus;
}
