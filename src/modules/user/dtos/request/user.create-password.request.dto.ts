import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmpty, IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ENUM_USER_PASSWORD_TYPE } from 'src/modules/user/enums/user.enum';

export class UserCreatePasswordRequestDto {
    @ApiProperty({
        required: true,
        enum: ENUM_USER_PASSWORD_TYPE,
        example: ENUM_USER_PASSWORD_TYPE.TEMPORARY_PASSWORD,
    })
    @IsEnum(ENUM_USER_PASSWORD_TYPE)
    @IsString()
    @IsEmpty()
    type: ENUM_USER_PASSWORD_TYPE;
}

export class UserCreatePasswordByAdminRequestDto extends UserCreatePasswordRequestDto {
    @ApiProperty({
        example: faker.string.uuid(),
        required: true,
    })
    @IsNotEmpty()
    @IsUUID()
    by: string;
}
