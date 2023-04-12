import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UserUpdateUsernameDto {
    @ApiProperty({
        example: faker.internet.userName(),
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    @Type(() => String)
    readonly username: string;
}
