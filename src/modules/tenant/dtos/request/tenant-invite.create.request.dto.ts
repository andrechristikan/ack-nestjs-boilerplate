import { ApiProperty } from '@nestjs/swagger';
import { IsCustomEmail } from '@common/request/validations/request.custom-email.validation';
import { Transform } from 'class-transformer';
import {
    IsEnum,
    IsIn,
    IsNotEmpty,
    IsOptional,
    IsPositive,
    Max,
    MaxLength,
} from 'class-validator';
import { EnumTenantMemberRole } from '@generated/prisma-client';

export class TenantInviteCreateRequestDto {
    private static readonly AllowedRoles = [
        EnumTenantMemberRole.admin,
        EnumTenantMemberRole.member,
    ] as const;

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
        enum: TenantInviteCreateRequestDto.AllowedRoles,
    })
    @IsEnum(EnumTenantMemberRole)
    @IsIn(TenantInviteCreateRequestDto.AllowedRoles)
    @IsNotEmpty()
    role: (typeof TenantInviteCreateRequestDto.AllowedRoles)[number];

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
