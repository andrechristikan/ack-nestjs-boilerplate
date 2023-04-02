import { faker } from '@faker-js/faker';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsString,
    IsNotEmpty,
    MaxLength,
    MinLength,
    IsEnum,
} from 'class-validator';
import { ENUM_AUTH_TYPE } from 'src/common/auth/constants/auth.enum.constant';
import { RoleUpdateDto } from 'src/modules/role/dtos/role.update.dto';

export class RoleCreateDto extends PartialType(RoleUpdateDto) {
    @ApiProperty({
        description: 'Name of role',
        example: faker.name.jobTitle(),
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(30)
    @Type(() => String)
    readonly name: string;

    @ApiProperty({
        description: 'Representative for role type',
        example: 'ADMIN',
        required: true,
    })
    @IsEnum(ENUM_AUTH_TYPE)
    @IsNotEmpty()
    readonly type: ENUM_AUTH_TYPE;
}
