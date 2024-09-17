import { faker } from '@faker-js/faker';
import {
    ApiHideProperty,
    ApiProperty,
    getSchemaPath,
    IntersectionType,
    PickType,
} from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';
import { DatabaseDto } from 'src/common/database/dtos/database.dto';
import { ENUM_PASSWORD_HISTORY_TYPE } from 'src/modules/password-history/enums/password-history.enum';
import { SessionListResponseDto } from 'src/modules/session/dtos/response/session.list.response.dto';
import { UserShortResponseDto } from 'src/modules/user/dtos/response/user.short.response.dto';

export class PasswordHistoryListResponseDto extends IntersectionType(
    DatabaseDto,
    PickType(SessionListResponseDto, ['expiredAt'] as const)
) {
    @ApiProperty({
        required: true,
        example: faker.string.uuid(),
    })
    user: string;

    @ApiProperty({
        required: true,
        type: UserShortResponseDto,
        oneOf: [{ $ref: getSchemaPath(UserShortResponseDto) }],
    })
    @Type(() => UserShortResponseDto)
    by: UserShortResponseDto;

    @ApiProperty({
        required: true,
        enum: ENUM_PASSWORD_HISTORY_TYPE,
        example: ENUM_PASSWORD_HISTORY_TYPE.TEMPORARY,
    })
    type: ENUM_PASSWORD_HISTORY_TYPE;

    @ApiHideProperty()
    @Exclude()
    password: string;
}
