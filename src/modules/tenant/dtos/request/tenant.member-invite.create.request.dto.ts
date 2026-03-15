import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, MaxLength } from 'class-validator';
import { IsCustomEmail } from '@common/request/validations/request.custom-email.validation';
import { Transform } from 'class-transformer';
import { EnumTenantMemberRole } from '@generated/prisma-client';

export class TenantMemberInviteCreateRequestDto {
    @ApiProperty({
        required: true,
        description: 'Email address to invite',
    })
    @IsNotEmpty()
    @MaxLength(100)
    @IsCustomEmail()
    @Transform(({ value }) => value.toLowerCase().trim())
    email: Lowercase<string>;

    @ApiProperty({
        required: true,
        description: 'Membership role for the invited member',
        enum: EnumTenantMemberRole,
    })
    @IsEnum(EnumTenantMemberRole)
    @IsNotEmpty()
    role: EnumTenantMemberRole;
}
