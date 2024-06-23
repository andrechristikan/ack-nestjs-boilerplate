import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmpty, IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ENUM_USER_PASSWORD_TYPE } from 'src/modules/user/constants/user.enum.constant';

export class UserCreatePasswordRequestDto {
    @ApiProperty({
        required: true,
        enum: ENUM_USER_PASSWORD_TYPE,
        example: ENUM_USER_PASSWORD_TYPE.TEMPORARY_PASSWORD,
    })
    @IsEnum(ENUM_USER_PASSWORD_TYPE)
    @IsString()
    @IsEmpty()
    readonly type: ENUM_USER_PASSWORD_TYPE;
}

export class UserCreatePasswordByAdminRequestDto extends UserCreatePasswordRequestDto {
    @ApiProperty({
        example: faker.string.uuid(),
        required: true,
    })
    @IsNotEmpty()
    @IsUUID()
    readonly by: string;
}
