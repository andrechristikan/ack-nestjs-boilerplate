import { faker } from '@faker-js/faker';
import { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class InviteClaimRequestDto extends PickType(UserSignUpRequestDto, [
    'password',
] as const) {
    @ApiProperty({ example: faker.person.firstName(), required: true, maxLength: 50, minLength: 1 })
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(50)
    firstName: string;

    @ApiProperty({ example: faker.person.lastName(), required: true, maxLength: 50, minLength: 1 })
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(50)
    lastName: string;
}
