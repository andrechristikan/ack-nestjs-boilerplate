import { RequestIsMongoIdException } from '@common/request/exceptions/request.is-mongo-id.exception';
import { ArgumentMetadata, Injectable } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common';
import { isMongoId } from 'class-validator';

/**
 * Validates a route param is a MongoDB ObjectId; throws 400 otherwise.
 */
@Injectable()
export class RequestIsValidObjectIdPipe implements PipeTransform {
    async transform(
        value: string,
        metadata: ArgumentMetadata
    ): Promise<string> {
        if (!value || typeof value !== 'string' || !isMongoId(value)) {
            throw new RequestIsMongoIdException(metadata.data!);
        }

        return value;
    }
}
