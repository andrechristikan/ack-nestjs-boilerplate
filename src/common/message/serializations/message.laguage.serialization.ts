import { ApiProperty } from '@nestjs/swagger';
import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/constants/message.enum.constant';

export class MessageLanguageSerialization {
    @ApiProperty({
        enum: ENUM_MESSAGE_LANGUAGE,
        type: 'array',
        isArray: true,
    })
    language: ENUM_MESSAGE_LANGUAGE[];
}
