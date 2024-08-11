import { faker } from '@faker-js/faker';
import { ApiProperty, OmitType } from '@nestjs/swagger';
import { IsNotEmpty, MaxLength, MinLength } from 'class-validator';
import { IsPassword } from 'src/common/request/validations/request.is-password.validation';
import { UserCreateRequestDto } from 'src/modules/user/dtos/request/user.create.request.dto';

export class AuthSignUpRequestDto extends OmitType(UserCreateRequestDto, [
    'role',
] as const) {
    @ApiProperty({
        description: 'string password',
        example: `${faker.string.alphanumeric(5).toLowerCase()}${faker.string
            .alphanumeric(5)
            .toUpperCase()}@@!123`,
        required: true,
        maxLength: 50,
        minLength: 8,
    })
    @IsNotEmpty()
    @IsPassword()
    @MinLength(8)
    @MaxLength(50)
    password: string;
}
