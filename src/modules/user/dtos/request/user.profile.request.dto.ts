import { ApiProperty, PickType } from '@nestjs/swagger';
import { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import { EnumUserGender } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { AwsS3PresignRequestDto } from '@common/aws/dtos/request/aws.s3-presign.request.dto';

export class UserUpdateProfileRequestDto extends PickType(
    UserCreateRequestDto,
    ['name', 'countryId'] as const
) {
    @ApiProperty({
        required: true,
        enum: EnumUserGender,
        example: EnumUserGender.male,
    })
    @IsEnum(EnumUserGender)
    @IsNotEmpty()
    gender: EnumUserGender;
}

export class UserUpdateProfilePhotoRequestDto extends PickType(
    AwsS3PresignRequestDto,
    ['size']
) {
    @ApiProperty({
        required: true,
        description: 'photo path key',
        example: 'user/profile/unique-photo-key.jpg',
    })
    @IsString()
    @IsNotEmpty()
    photoKey: string;
}
