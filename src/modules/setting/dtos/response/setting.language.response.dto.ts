import { ApiProperty } from '@nestjs/swagger';
import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';

export class SettingLanguageResponseDto {
    @ApiProperty({
        required: true,
        nullable: false,
        enum: ENUM_MESSAGE_LANGUAGE,
        type: 'array',
        isArray: true,
    })
    availableLanguage: ENUM_MESSAGE_LANGUAGE[];

    @ApiProperty({
        required: true,
        nullable: false,
        enum: ENUM_MESSAGE_LANGUAGE,
    })
    language: ENUM_MESSAGE_LANGUAGE;
}
