import { EnumTermPolicyType } from '@generated/prisma-client';
import { UserListResponseDto } from '@modules/user/dtos/response/user.list.response.dto';
import { UserTermPolicyDto } from '@modules/user/dtos/user.term-policy.dto';
import { ApiHideProperty, ApiProperty, OmitType } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';

export class UserExportResponseDto extends OmitType(UserListResponseDto, [
    'role',
    'photo',
]) {
    @ApiHideProperty()
    @Exclude()
    termPolicy: UserTermPolicyDto;

    @ApiProperty({
        required: true,
        description: 'User photo URL',
        example: 'https://example.com/photo.jpg',
    })
    @Expose()
    @Transform(({ obj }) => obj.photo.completedUrl)
    photo: string;

    @ApiProperty({
        required: true,
        description: 'Term of service flag',
        example: true,
    })
    @Expose()
    @Transform(({ obj }) => obj.termPolicy?.[EnumTermPolicyType.termsOfService])
    termPolicyTermsOfService: boolean;

    @ApiProperty({
        required: true,
        description: 'Privacy flag',
        example: true,
    })
    @Expose()
    @Transform(({ obj }) => obj.termPolicy?.[EnumTermPolicyType.privacy])
    termPolicyPrivacy: boolean;

    @ApiProperty({
        required: true,
        description: 'Cookies flag',
        example: true,
    })
    @Expose()
    @Transform(({ obj }) => obj.termPolicy?.[EnumTermPolicyType.cookies])
    termPolicyCookies: boolean;

    @ApiProperty({
        required: true,
        description: 'Marketing flag',
        example: true,
    })
    @Expose()
    @Transform(({ obj }) => obj.termPolicy?.[EnumTermPolicyType.marketing])
    termPolicyMarketing: boolean;

    @ApiProperty({
        required: true,
        description: 'User role',
        example: 'admin',
    })
    @Expose()
    @Transform(({ obj }) => obj.role.name)
    role: string;
}
