import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import {
    ArgumentMetadata,
    BadRequestException,
    Injectable,
} from '@nestjs/common';
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
            throw new BadRequestException({
                statusCode: EnumRequestStatusCodeError.paramRequired,
                message: 'request.error.paramRequired',
                messageProperties: {
                    property: metadata.data,
                },
            });
        }

        return value;
    }
}
