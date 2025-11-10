import { faker } from '@faker-js/faker';
import { UserChangePasswordRequestDto } from '@modules/user/dtos/request/user.change-password.request.dto';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ResetPasswordResetRequestDto extends PickType(
    UserChangePasswordRequestDto,
    ['newPassword'] as const
) {
    @ApiProperty({
        required: true,
        description: 'Reset password token',
        example: faker.string.alphanumeric(20),
    })
    @IsString()
    @IsNotEmpty()
    token: string;
}
