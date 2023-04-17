import { applyDecorators } from '@nestjs/common';
import { Doc } from 'src/common/doc/decorators/doc.decorator';
import { MessageLanguageSerialization } from 'src/common/message/serializations/message.language.serialization';

export function MessagePublicLanguageDoc(): MethodDecorator {
    return applyDecorators(
        Doc<MessageLanguageSerialization>('message.languages', {
            response: { serialization: MessageLanguageSerialization },
        })
    );
}
