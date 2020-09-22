import {
    PipeTransform,
    Injectable,
    ArgumentMetadata,
    BadRequestException,
} from '@nestjs/common';
import { CountryStore } from 'country/pipe/country.store.dto';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { Error } from 'error/error.decorator';
import { ErrorService } from 'error/error.service';

@Injectable()
export class CountryStorePipe implements PipeTransform<any> {
    constructor(@Error() private readonly errorService: ErrorService) {}

    async transform(
        value: Record<string, any>,
        { metatype }: ArgumentMetadata,
    ): Promise<Record<string, any>> {
        if (!metatype || !this.toValidate(metatype)) {
            return value;
        }

        const data: CountryStore = plainToClass(CountryStore, value);
        const errors: Record<string, any>[] = await validate(data);
        if (errors.length > 0) {
            throw this.errorService.apiRequestError(errors);
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
