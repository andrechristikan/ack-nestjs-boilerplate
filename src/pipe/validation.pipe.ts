import {
    PipeTransform,
    Injectable,
    ArgumentMetadata,
    BadRequestException,
} from '@nestjs/common';
import { ObjectSchema } from '@hapi/joi';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
    constructor(
        private readonly schema: ObjectSchema,
    ) {}

    async transform(
        value: Record<string, any>,
        { metatype }: ArgumentMetadata,
    ): Promise<Record<string, any>> {
        if (!metatype || !this.toValidate(metatype)) {
            return value;
        }

        const { errors } = this.schema.validate(value);
        if (errors) {
            console.log(errors);
            throw new BadRequestException('Validation failed');
            // throw new BadRequestException(this.buildError(errors));
        }
        return value;
    }

    private toValidate(metatype: Record<string, any>): boolean {
        const types: Record<string, any>[] = [
            String,
            Boolean,
            Number,
            Array,
            Object,
        ];
        return types.includes(metatype);
    }

}
