import { ApiProperty, PickType } from '@nestjs/swagger';
import { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import { ENUM_USER_GENDER } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsUrl } from 'class-validator';
import { AwsS3PresignRequestDto } from '@common/aws/dtos/request/aws.s3-presign.request.dto';

export class UserUpdateProfileRequestDto extends PickType(
    UserCreateRequestDto,
    ['name', 'countryId'] as const
) {
    @ApiProperty({
        required: true,
        enum: ENUM_USER_GENDER,
        example: ENUM_USER_GENDER.male,
    })
    @IsEnum(ENUM_USER_GENDER)
    @IsNotEmpty()
    gender: ENUM_USER_GENDER;
}

export class UserUpdateProfilePhotoRequestDto extends PickType(
    AwsS3PresignRequestDto,
    ['size']
) {
    @ApiProperty({
        required: true,
        description: 'photo url',
        example: 'https://bucket.s3.region.amazonaws.com/path/to/photo.jpg',
    })
    @IsUrl()
    @IsNotEmpty()
    photo: string;
}
