import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import {
    ArgumentMetadata,
    BadRequestException,
    Injectable,
} from '@nestjs/common';
import { PipeTransform } from '@nestjs/common';
import { isMongoId } from 'class-validator';

/**
 * Pipe that validates if the input value is a valid MongoDB ObjectId
 */
@Injectable()
export class RequestIsValidObjectIdPipe implements PipeTransform {
    /**
     * Validates and transforms the input value to ensure it's a valid MongoDB ObjectId
     * @param {string} value - The input value to validate
     * @param {ArgumentMetadata} metadata - NestJS argument metadata containing validation context
     * @returns {Promise<string>} Promise that resolves to the validated ObjectId string
     */
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
