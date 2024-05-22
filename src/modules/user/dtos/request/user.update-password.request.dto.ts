import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { IsPassword } from 'src/common/request/validations/request.is-password.validation';

export class UserUpdatePasswordRequestDto {
    @ApiProperty({
        description: 'new string password',
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
    readonly password: string;
}
