import { ENUM_REQUEST_STATUS_CODE_ERROR } from '@common/request/enums/request.status-code.enum';
import {
    ArgumentMetadata,
    BadRequestException,
    Injectable,
} from '@nestjs/common';
import { PipeTransform } from '@nestjs/common';
import { Types } from 'mongoose';

/**
 * Validation pipe that ensures string values are valid MongoDB ObjectIds.
 * Throws BadRequestException for invalid ObjectId formats.
 */
@Injectable()
export class RequestObjectIdPipe implements PipeTransform {
    /**
     * Validates that the input value is a valid MongoDB ObjectId format.
     *
     * @param value - The string value to validate as an ObjectId
     * @param metadata - Argument metadata containing parameter information
     * @returns The validated ObjectId string if valid
     * @throws {BadRequestException} When value is invalid ObjectId format
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
