import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import {
    ArgumentMetadata,
    BadRequestException,
    Injectable,
} from '@nestjs/common';
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
            throw new BadRequestException({
                statusCode: EnumRequestStatusCodeError.validation,
                message: 'request.error.isMongoId',
                messageProperties: {
                    property: metadata.data,
                },
            });
        }

        return value;
    }
}
