import { RequestIsMongoIdException } from '@common/request/exceptions/request.is-mongo-id.exception';
import { IRequestIsValidObjectIdPipeOptions } from '@common/request/interfaces/request.interface';
import { ArgumentMetadata, Injectable, Optional } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common';
import { isMongoId } from 'class-validator';

/**
 * Validates a param is a MongoDB ObjectId; throws 400 otherwise, or passes an absent value through in optional mode.
 */
@Injectable()
export class RequestIsValidObjectIdPipe implements PipeTransform {
    constructor(
        @Optional()
        private readonly options: IRequestIsValidObjectIdPipeOptions = {
            optional: false,
        }
    ) {}

    async transform(
        value: string | undefined,
        metadata: ArgumentMetadata
    ): Promise<string | undefined> {
        if (!value && this.options.optional) {
            return undefined;
        }

        if (!value || typeof value !== 'string' || !isMongoId(value)) {
            throw new RequestIsMongoIdException(metadata.data!);
        }

        return value;
    }
}
