import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IsCustomEmail } from '@common/request/validations/request.custom-email.validation';
import { Transform } from 'class-transformer';

export class TenantMemberInviteCreateRequestDto {
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
        description: 'Role id for the member',
        example: '65f3d2e44b9a7e1bd2c9a8f1',
    })
    @IsString()
    @IsNotEmpty()
    @IsMongoId()
    roleId: string;
}
