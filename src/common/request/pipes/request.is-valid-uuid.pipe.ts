import { RequestIsUuidException } from '@common/request/exceptions/request.is-uuid.exception';
import { IRequestIsValidUuidPipeOptions } from '@common/request/interfaces/request.interface';
import { ArgumentMetadata, Injectable, Optional } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common';
import { validate as isUuid } from 'uuid';

/**
 * Validates a route param is a UUID; throws 400 otherwise.
 */
@Injectable()
export class RequestIsValidUuidPipe implements PipeTransform {
    constructor(
        @Optional()
        private readonly options: IRequestIsValidUuidPipeOptions = {
            optional: false,
        }
    ) {}

    async transform(
        value: string,
        metadata: ArgumentMetadata
    ): Promise<string> {
        if (this.options.optional && (value === undefined || value === null)) {
            return value;
        }

        if (!value || typeof value !== 'string' || !isUuid(value)) {
            throw new RequestIsUuidException(metadata.data!);
        }

        return value;
    }
}
