import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UserUpdateGoogleSSODto {
    @ApiProperty({
        example: faker.random.alphaNumeric(30),
        description: 'Will be valid SSO Token Encode string from google API',
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    readonly accessToken: string;

    @ApiProperty({
        example: faker.random.alphaNumeric(30),
        description:
            'Will be valid SSO Secret Token Encode string from google API',
        required: true,
    })
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    readonly refreshToken: string;
}
