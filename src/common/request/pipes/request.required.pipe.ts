import { ENUM_REQUEST_STATUS_CODE_ERROR } from '@common/request/enums/request.status-code.enum';
import {
    ArgumentMetadata,
    BadRequestException,
    Injectable,
} from '@nestjs/common';
import { PipeTransform } from '@nestjs/common';

/**
 * Validation pipe that ensures required parameters are present.
 * Throws BadRequestException when value is missing or empty.
 */
@Injectable()
export class RequestRequiredPipe implements PipeTransform {
    /**
     * Validates that the input value is not empty or undefined.
     *
     * @param value - The input value to validate
     * @param metadata - Argument metadata containing parameter information
     * @returns The validated value if present
     * @throws {BadRequestException} When value is missing or empty
     */
    async transform(
        value: string,
        metadata: ArgumentMetadata
    ): Promise<string> {
        if (!value) {
            throw new BadRequestException({
                statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.paramRequired,
                message: 'request.error.paramRequired',
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
