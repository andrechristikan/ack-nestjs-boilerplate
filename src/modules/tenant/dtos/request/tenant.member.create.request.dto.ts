import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsNotEmpty, IsString } from 'class-validator';
import { EnumTenantMemberRole } from '@generated/prisma-client';

export class TenantMemberCreateRequestDto {
    @ApiProperty({
        required: true,
        description: 'User id',
    })
    @IsString()
    @IsNotEmpty()
    @IsMongoId()
    userId: string;

    @ApiProperty({
        required: true,
        description: 'Membership role',
        enum: EnumTenantMemberRole,
    })
    @IsEnum(EnumTenantMemberRole)
    @IsNotEmpty()
    role: EnumTenantMemberRole;
}
