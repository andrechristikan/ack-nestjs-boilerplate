import { faker } from '@faker-js/faker';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserCreateRequestDto } from 'src/modules/user/dtos/request/user.create.request.dto';

export class UserUpdateProfileRequestDto extends PickType(
    UserCreateRequestDto,
    ['name', 'country'] as const
) {
    @ApiProperty({
        example: faker.person.lastName(),
        required: false,
        maxLength: 50,
        minLength: 1,
    })
    @IsString()
    @IsOptional()
    @MinLength(1)
    @MaxLength(50)
    @Type(() => String)
    readonly familyName?: string;

    @ApiProperty({
        required: false,
        maxLength: 200,
    })
    @IsString()
    @IsOptional()
    readonly address?: string;
}
