import { Expose, Transform } from 'class-transformer';
import {
    IsString,
    IsOptional,
    ValidateIf,
    IsNumber,
    IsObject
} from 'class-validator';
import {
    DEFAULT_PAGE,
    DEFAULT_PER_PAGE
} from 'src/pagination/pagination.constant';

export class RequestQueryBaseListValidation {
    constructor(defaultSort: string) {
        const fieldSort: string = defaultSort.split('@')[0];
        const typeSort: number = defaultSort.split('@')[1] === 'desc' ? -1 : 1;
        this.sort = { [fieldSort]: typeSort };
    }

    @IsString()
    @IsOptional()
    @ValidateIf((e) => e.search !== '')
    @Expose()
    @Transform(({ value }) => (value ? value : undefined), {
        toClassOnly: true
    })
    readonly search?: string;

    @IsNumber()
    @IsOptional()
    @ValidateIf((e) => e.page !== '')
    @Expose()
    @Transform(
        ({ value }) =>
            value && !isNaN(value) ? parseInt(value) : DEFAULT_PAGE,
        { toClassOnly: true }
    )
    readonly page: number;

    @IsNumber()
    @IsOptional()
    @ValidateIf((e) => e.perPage !== '')
    @Expose()
    @Transform(
        ({ value }) =>
            value && !isNaN(value) ? parseInt(value) : DEFAULT_PER_PAGE,
        { toClassOnly: true }
    )
    readonly perPage: number;

    @IsObject()
    @IsOptional()
    @ValidateIf((e) => e.sort !== '')
    @Expose()
    @Transform(
        ({ value }) => {
            if (!value) {
                return undefined;
            }

            const sort = value.split('@');
            const fieldSort: string = value.split('@')[0];
            const typeSort: number = value.split('@')[1] === 'desc' ? -1 : 1;

            return value && sort.length === 2
                ? { [fieldSort]: typeSort }
                : undefined;
        },
        {
            toClassOnly: true
        }
    )
    readonly sort: Record<string, any>;
}
