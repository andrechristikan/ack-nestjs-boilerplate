import { faker } from '@faker-js/faker';
import { ApiProperty, OmitType } from '@nestjs/swagger';
import { IsNotEmpty, IsNotEmptyObject, IsObject, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { IsPassword } from '@common/request/validations/request.is-password.validation';
import { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import { TermsPolicySignupRequestDto } from '@modules/terms-policy/dtos/request/terms-policy.signup.request.dto';
import { Type } from 'class-transformer';

export class AuthSignUpRequestDto extends OmitType(UserCreateRequestDto, [
    'role',
    'gender',
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

    @IsObject()
    @IsNotEmptyObject()
    @ValidateNested()
    @Type(() => TermsPolicySignupRequestDto)
    legal: TermsPolicySignupRequestDto
}
