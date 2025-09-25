import { faker } from '@faker-js/faker';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';

export class UserAddMobileNumberRequestDto extends PickType(
    UserCreateRequestDto,
    ['countryId'] as const
) {
    @ApiProperty({
        example: `8${faker.string.fromCharacters('1234567890', {
            min: 7,
            max: 11,
        })}`,
        required: true,
        maxLength: 20,
        minLength: 8,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(22)
    number: string;

    @ApiProperty({
        example: '62',
        required: true,
        maxLength: 6,
        minLength: 1,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(6)
    phoneCode: string;
}

export class UserUpdateMobileNumberRequestDto extends UserAddMobileNumberRequestDto {}
