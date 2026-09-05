import {
    ArgumentMetadata,
    Injectable,
    StandardSchemaValidationPipe,
} from '@nestjs/common';
import { RequestSchemaMissingException } from '@common/request/exceptions/request.schema-missing.exception';

/**
 * The global validation pipe, fail-closed on the body: a request body reaching a handler with no
 * schema attached is a wiring defect, and it stops here rather than reaching the handler
 * unchecked.
 */
@Injectable()
export class RequestSchemaValidationPipe extends StandardSchemaValidationPipe {
    async transform<T = unknown>(
        value: T,
        metadata: ArgumentMetadata
    ): Promise<T> {
        if (metadata.type === 'body' && !metadata.schema) {
            throw new RequestSchemaMissingException();
        }

        return super.transform(value, metadata);
    }
}
