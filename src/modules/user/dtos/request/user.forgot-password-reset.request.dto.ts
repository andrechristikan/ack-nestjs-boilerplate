import { faker } from '@faker-js/faker';
import { UserChangePasswordRequestDto } from '@modules/user/dtos/request/user.change-password.request.dto';
import { UserLoginVerifyTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';
import {
    ApiProperty,
    IntersectionType,
    OmitType,
    PartialType,
    PickType,
} from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UserForgotPasswordResetRequestDto extends IntersectionType(
    PickType(UserChangePasswordRequestDto, ['newPassword'] as const),
    PartialType(
        OmitType(UserLoginVerifyTwoFactorRequestDto, ['challengeToken'])
    )
) {
    @ApiProperty({
        required: true,
        description: 'Forgot password token',
        example: faker.string.alphanumeric(20),
    })
    @IsString()
    @IsNotEmpty()
    token: string;
}
