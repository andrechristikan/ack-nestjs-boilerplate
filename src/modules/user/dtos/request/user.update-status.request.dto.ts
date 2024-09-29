import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ENUM_USER_STATUS } from 'src/modules/user/enums/user.enum';

export class UserUpdateStatusRequestDto {
    @ApiProperty({
        required: true,
        enum: ENUM_USER_STATUS,
        default: ENUM_USER_STATUS.ACTIVE,
    })
    @IsString()
    @IsEnum(ENUM_USER_STATUS)
    @IsNotEmpty()
    status: ENUM_USER_STATUS;
}
