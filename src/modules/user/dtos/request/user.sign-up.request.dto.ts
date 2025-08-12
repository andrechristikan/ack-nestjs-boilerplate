import { faker } from '@faker-js/faker';
import { ApiProperty, OmitType } from '@nestjs/swagger';
import {
    IsISO31661Alpha2,
    IsMongoId,
    IsNotEmpty,
    IsString,
    IsUppercase,
    MaxLength,
    MinLength,
} from 'class-validator';
import { IsCustomEmail } from '@common/request/validations/request.custom-email.validation';
import { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import { IsPassword } from '@common/request/validations/request.is-password.validation';

export class UserSignUpRequestDto extends OmitType(UserCreateRequestDto, [
    'roleId',
] as const) {
    @ApiProperty({
        description:
            'string password, must be at least 8 characters long and contain a mix of letters, numbers, and special characters',
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
    password: string;
}
