import {
    PipeTransform,
    ArgumentMetadata,
    BadRequestException,
    Type,
    mixin
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { IApiError } from 'error/error.interface';
import { Error } from 'error/error.decorator';
import { ErrorService } from 'error/error.service';

export function RequestValidationPipe(schema: {
    new (...args: any[]): any;
}): Type<PipeTransform> {
    class MixinRequestValidationPipe implements PipeTransform {
        constructor(@Error() private readonly errorService: ErrorService) {}

        async transform(
            value: Record<string, any>,
            { metatype }: ArgumentMetadata
        ): Promise<Record<string, any>> {
            if (!metatype || !this.toValidate(metatype)) {
                return value;
            }

            const object: Record<string, any> = plainToClass(schema, value);
            console.log(object);
            const errors: Record<string, any>[] = await validate(object);
            if (errors.length > 0) {
                throw new BadRequestException(
                    this.errorService.setRequestErrorMessage(errors)
                );
            }
            return value;
        }

        private toValidate(metatype: Record<string, any>): boolean {
            const types: Record<string, any>[] = [
                String,
                Boolean,
                Number,
                Array,
                Object
            ];
            return types.includes(metatype);
        }
    }

    return mixin(MixinRequestValidationPipe);
}
