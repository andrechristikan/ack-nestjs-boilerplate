import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import {
    IsMongoId,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';
import { IsCustomEmail } from '@common/request/validations/request.custom-email.validation';
import { Transform } from 'class-transformer';
import { UserClaimUsernameRequestDto } from '@modules/user/dtos/request/user.claim-username.request.dto';

export class UserCreateRequestDto extends UserClaimUsernameRequestDto {
    @ApiProperty({
        example: faker.internet.email(),
        required: true,
        maxLength: 100,
        description: 'Email address of the user to create',
    })
    @IsCustomEmail()
    @IsNotEmpty()
    @MaxLength(100)
    @Transform(({ value }) => value.toLowerCase().trim())
    email: Lowercase<string>;

    @ApiProperty({
        example: faker.database.mongodbObjectId(),
        required: true,
        description: 'Identifier of the role to assign',
    })
    @IsString()
    @IsNotEmpty()
    @IsMongoId()
    roleId: string;

    @ApiProperty({
        example: faker.person.fullName(),
        required: false,
        maxLength: 100,
        minLength: 1,
        description: 'Display name of the user to create',
    })
    @IsString()
    @IsOptional()
    @MinLength(1)
    @MaxLength(100)
    name?: string;

    @ApiProperty({
        example: faker.database.mongodbObjectId(),
        required: true,
        description: 'Identifier of the user country',
    })
    @IsString()
    @IsNotEmpty()
    @IsMongoId()
    countryId: string;
}
