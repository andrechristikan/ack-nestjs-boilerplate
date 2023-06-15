import { applyDecorators } from '@nestjs/common';
import { AppHelloSerialization } from 'src/app/serializations/app.hello.serialization';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';

export function AppHelloDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocResponse<AppHelloSerialization>('app.hello', {
            serialization: AppHelloSerialization,
        })
    );
}

export function AppHelloApiKeyDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocAuth({ apiKey: true }),
        DocRequest({ timestamp: true, userAgent: true }),
        DocResponse<AppHelloSerialization>('app.helloApiKey', {
            serialization: AppHelloSerialization,
        })
    );
}
