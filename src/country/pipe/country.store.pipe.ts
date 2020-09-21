import {
    PipeTransform,
    Injectable,
    ArgumentMetadata,
    BadRequestException,
} from '@nestjs/common';
import { CountryStore } from 'country/pipe/country.store';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { Error } from 'error/error.decorator';
import { ErrorService } from 'error/error.service';

@Injectable()
export class CountryStorePipe implements PipeTransform<any> {
    constructor() {}

    async transform(
        value: Record<string, any>,
        { metatype }: ArgumentMetadata,
    ): Promise<Record<string, any>> {
        if (!metatype || !this.toValidate(metatype)) {
            return value;
        }

        const data = plainToClass(CountryStore, value);
        const errors = await validate(data);
        console.log('errors', errors);
        if (errors.length > 0) {
            throw new BadRequestException('Validation failed');
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
