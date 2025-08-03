import { ENUM_REQUEST_STATUS_CODE_ERROR } from '@common/request/enums/request.status-code.enum';
import {
    ArgumentMetadata,
    BadRequestException,
    Injectable,
} from '@nestjs/common';
import { PipeTransform } from '@nestjs/common';

@Injectable()
export class RequestRequiredPipe implements PipeTransform {
    async transform(
        value: string,
        metadata: ArgumentMetadata
    ): Promise<string> {
        if (!value) {
            throw new BadRequestException({
                statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.PARAM_REQUIRED,
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
