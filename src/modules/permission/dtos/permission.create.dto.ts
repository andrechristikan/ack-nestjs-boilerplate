import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ENUM_PERMISSION_GROUP } from 'src/modules/permission/constants/permission.enum.constant';

export class PermissionCreateDto {
    @ApiProperty({
        description: 'Permission group',
        example: 'PERMISSION',
        required: true,
    })
    @IsEnum(ENUM_PERMISSION_GROUP)
    @IsNotEmpty()
    readonly group: ENUM_PERMISSION_GROUP;

    @ApiProperty({
        description: 'Unique code of permission',
        example: faker.random.alpha(5),
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    readonly code: string;

    @ApiProperty({
        description: 'Description of permission',
        example: 'blabla description',
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    readonly description: string;
}
