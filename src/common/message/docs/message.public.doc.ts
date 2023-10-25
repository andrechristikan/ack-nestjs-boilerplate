import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { MessageLanguageSerialization } from 'src/common/message/serializations/message.language.serialization';

export function MessagePublicLanguageDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get all language of app' }),
        DocAuth({ apiKey: true }),
        DocResponse<MessageLanguageSerialization>('apiKey.languages', {
            serialization: MessageLanguageSerialization,
        })
    );
}
