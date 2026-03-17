import { ApiProperty } from '@nestjs/swagger';
import { EnumProjectMemberRole } from '@generated/prisma-client';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IsCustomEmail } from '@common/request/validations/request.custom-email.validation';
import { Transform } from 'class-transformer';

export class ProjectMemberInviteCreateRequestDto {
    @ApiProperty({
        required: true,
        description: 'Email address to invite',
    })
    @IsCustomEmail()
    @IsNotEmpty()
    @MaxLength(100)
    @Transform(({ value }) => value.toLowerCase().trim())
    email: Lowercase<string>;

    @ApiProperty({
        required: true,
        description: 'Role for the member',
        enum: EnumProjectMemberRole,
    })
    @IsString()
    @IsNotEmpty()
    @IsEnum(EnumProjectMemberRole)
    role: EnumProjectMemberRole;
}
