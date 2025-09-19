import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import {
    IsAlphanumeric,
    IsNotEmpty,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';
import { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import { Transform } from 'class-transformer';

export class RoleCreateRequestDto extends RoleUpdateRequestDto {
    @ApiProperty({
        description: 'Name of role',
        example: faker.person.jobTitle(),
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    @IsAlphanumeric()
    @MinLength(3)
    @MaxLength(30)
    @Transform(({ value }) => value.toLowerCase().trim())
    name: Lowercase<string>;
}
