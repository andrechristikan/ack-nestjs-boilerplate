import { IsPassword } from '@common/request/validations/request.is-password.validation';
import { faker } from '@faker-js/faker';
import { UserLoginVerifyTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';
import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class UserChangePasswordRequestDto extends PartialType(
    OmitType(UserLoginVerifyTwoFactorRequestDto, ['challengeToken'])
) {
    @ApiProperty({
        description:
            "new string password, newPassword can't same with oldPassword",
        example: `${faker.string.alphanumeric(5).toLowerCase()}${faker.string
            .alphanumeric(5)
            .toUpperCase()}@@!123`,
        required: true,
        minLength: 8,
        maxLength: 50,
    })
    @IsNotEmpty()
    @IsString()
    @IsPassword()
    @MinLength(8)
    @MaxLength(50)
    newPassword: string;

    @ApiProperty({
        description: 'old string password',
        example: `${faker.string.alphanumeric(5).toLowerCase()}${faker.string
            .alphanumeric(5)
            .toUpperCase()}@@!123`,
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    oldPassword: string;
}
