import { faker } from '@faker-js/faker';
import {
    ApiHideProperty,
    ApiProperty,
    IntersectionType,
    PickType,
} from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import { ENUM_USER_PASSWORD_TYPE } from 'src/modules/user/enums/user.enum';
import { UserStateHistoryListResponseDto } from 'src/modules/user/dtos/response/user-state-history.list.response.dto';

export class UserPasswordHistoryListResponseDto extends IntersectionType(
    PickType(UserStateHistoryListResponseDto, ['user', 'by']),
    DatabaseIdResponseDto
) {
    @ApiProperty({
        required: true,
        enum: ENUM_USER_PASSWORD_TYPE,
        example: ENUM_USER_PASSWORD_TYPE.TEMPORARY_PASSWORD,
    })
    type: ENUM_USER_PASSWORD_TYPE;

    @ApiHideProperty()
    @Exclude()
    password: string;

    @ApiProperty({
        description: 'Date created at',
        example: faker.date.recent(),
        required: true,
        nullable: false,
    })
    createdAt: Date;

    @ApiProperty({
        description: 'Date updated at',
        example: faker.date.recent(),
        required: true,
        nullable: false,
    })
    updatedAt: Date;

    @ApiHideProperty()
    @Exclude()
    deletedAt?: Date;
}
