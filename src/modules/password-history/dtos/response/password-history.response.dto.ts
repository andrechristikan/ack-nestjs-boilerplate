import { DatabaseDto } from '@common/database/dtos/database.dto';
import { faker } from '@faker-js/faker';
import { UserListResponseDto } from '@modules/user/dtos/response/user.list.response.dto';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { ENUM_PASSWORD_HISTORY_TYPE } from '@prisma/client';
import { Exclude, Type } from 'class-transformer';

export class PasswordHistoryResponseDto extends DatabaseDto {
    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
    })
    userId: string;

    @ApiProperty({
        required: true,
        type: UserListResponseDto,
    })
    @Type(() => UserListResponseDto)
    user: UserListResponseDto;

    @ApiHideProperty()
    @Exclude()
    password: string;

    @ApiHideProperty()
    @Exclude()
    salt: string;

    @ApiProperty({
        required: true,
        example: ENUM_PASSWORD_HISTORY_TYPE.admin,
        enum: ENUM_PASSWORD_HISTORY_TYPE,
    })
    type: ENUM_PASSWORD_HISTORY_TYPE;

    @ApiProperty({
        required: true,
        example: faker.date.future(),
    })
    expiredAt: Date;
}
