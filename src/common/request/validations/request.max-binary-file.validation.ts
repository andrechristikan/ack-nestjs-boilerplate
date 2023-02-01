import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';
import { ENUM_FILE_TYPE } from 'src/common/file/constants/file.enum.constant';

@ValidatorConstraint({ async: true })
@Injectable()
export class MaxBinaryFileConstraint implements ValidatorConstraintInterface {
    constructor(private readonly configService: ConfigService) {}

    validate(value: string, args: ValidationArguments): boolean {
        const [type] = args.constraints;
        let fileSize = 0;

        switch (type) {
            case ENUM_FILE_TYPE.AUDIO:
                fileSize = this.configService.get<number>(
                    'file.audio.maxFileSize'
                );
                break;
            case ENUM_FILE_TYPE.EXCEL:
                fileSize = this.configService.get<number>(
                    'file.excel.maxFileSize'
                );
                break;
            case ENUM_FILE_TYPE.IMAGE:
                fileSize = this.configService.get<number>(
                    'file.image.maxFileSize'
                );
                break;
            case ENUM_FILE_TYPE.VIDEO:
                fileSize = this.configService.get<number>(
                    'file.video.maxFileSize'
                );
                break;
            default:
                break;
        }

        return fileSize <= value.length;
    }
}

export function MaxBinaryFile(
    type: ENUM_FILE_TYPE,
    validationOptions?: ValidationOptions
) {
    return function (object: Record<string, any>, propertyName: string): any {
        registerDecorator({
            name: 'MaxBinaryFile',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [type],
            validator: MaxBinaryFileConstraint,
        });
    };
}
