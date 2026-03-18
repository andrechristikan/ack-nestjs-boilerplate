import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsPositive, Max, MaxLength } from 'class-validator';
import { IsCustomEmail } from '@common/request/validations/request.custom-email.validation';
import { Transform } from 'class-transformer';
import { EnumTenantMemberRole } from '@generated/prisma-client';

export class TenantInviteCreateRequestDto {
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
        description:
            'Membership role for the invited member (owner is forbidden)',
        enum: EnumTenantMemberRole,
    })
    @IsEnum(EnumTenantMemberRole)
    @IsNotEmpty()
    role: EnumTenantMemberRole;

    @ApiProperty({
        description:
            'Number of days until the invitation expires (default: 7, max: 30)',
        default: 7,
        maximum: 30,
        minimum: 1,
    })
    @IsOptional()
    @IsPositive()
    @Max(30)
    expiresInDays?: number;
}
