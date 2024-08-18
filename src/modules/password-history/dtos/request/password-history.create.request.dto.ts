import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmpty, IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ENUM_PASSWORD_HISTORY_TYPE } from 'src/modules/password-history/enums/password-history.enum';

export class PasswordHistoryCreateRequestDto {
    @ApiProperty({
        required: true,
        enum: ENUM_PASSWORD_HISTORY_TYPE,
        example: ENUM_PASSWORD_HISTORY_TYPE.TEMPORARY,
    })
    @IsEnum(ENUM_PASSWORD_HISTORY_TYPE)
    @IsString()
    @IsEmpty()
    type: ENUM_PASSWORD_HISTORY_TYPE;
}

export class PasswordHistoryCreateByAdminRequestDto extends PasswordHistoryCreateRequestDto {
    @ApiProperty({
        example: faker.string.uuid(),
        required: true,
    })
    @IsNotEmpty()
    @IsUUID()
    by: string;
}
