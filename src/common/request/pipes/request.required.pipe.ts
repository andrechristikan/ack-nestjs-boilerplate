import { RequestParamRequiredException } from '@common/request/exceptions/request.param-required.exception';
import { ArgumentMetadata, Injectable } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common';

/**
 * Ensures a required param is present; throws 400 when missing or empty.
 */
@Injectable()
export class RequestRequiredPipe implements PipeTransform {
    async transform(
        value: string,
        metadata: ArgumentMetadata
    ): Promise<string> {
        if (!value) {
            throw new RequestParamRequiredException(metadata.data!);
        }

        return value;
    }
}
