import { ENUM_REQUEST_STATUS_CODE_ERROR } from '@common/request/enums/request.status-code.enum';
import {
    ArgumentMetadata,
    BadRequestException,
    Injectable,
} from '@nestjs/common';
import { PipeTransform } from '@nestjs/common';
import { Types } from 'mongoose';

/**
 * A NestJS pipe that validates if a string value is a valid MongoDB ObjectId.
 *
 * This pipe transforms and validates incoming request parameters, ensuring they
 * conform to MongoDB's ObjectId format. If the validation fails, it throws a
 * BadRequestException with detailed error information.
 *
 * @implements {PipeTransform}
 */
@Injectable()
export class RequestObjectIdPipe implements PipeTransform {
    /**
     * Transforms and validates a string value to ensure it's a valid MongoDB ObjectId.
     *
     * This method checks if the provided value is a valid ObjectId format using
     * Mongoose's Types.ObjectId.isValid() method. If the validation fails, it throws
     * a BadRequestException with standardized error information including the field
     * name that failed validation.
     *
     * @param {string} value - The string value to validate as an ObjectId
     * @param {ArgumentMetadata} metadata - Metadata about the argument being validated,
     *                                      including the parameter name for error reporting
     * @returns {Promise<string>} The validated ObjectId string if valid
     * @throws {BadRequestException} When the value is null, undefined, or not a valid ObjectId format
     */
    async transform(
        value: string,
        metadata: ArgumentMetadata
    ): Promise<string> {
        if (!value || !Types.ObjectId.isValid(value)) {
            throw new BadRequestException({
                statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.VALIDATION,
                message: 'request.error.isMongoId',
                metadata: {
                    customProperty: {
                        messageProperties: {
                            property: metadata.data,
                        },
                    },
                },
            });
        }

        return value;
    }
}
