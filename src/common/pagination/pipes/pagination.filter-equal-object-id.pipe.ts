import { Injectable } from '@nestjs/common';
import { ArgumentMetadata, PipeTransform } from '@nestjs/common/interfaces';
import { Types } from 'mongoose';
import { PaginationService } from 'src/common/pagination/services/pagination.service';

@Injectable()
export class PaginationFilterEqualObjectIdPipe implements PipeTransform {
    constructor(private readonly paginationService: PaginationService) {}

    async transform(
        value: string,
        { data: field }: ArgumentMetadata
    ): Promise<Record<string, Types.ObjectId | string>> {
        if (!value) {
            return undefined;
        }

        value = value.trim();
        const finalValue = Types.ObjectId.isValid(value)
            ? new Types.ObjectId(value)
            : value;

        return this.paginationService.filterEqual<Types.ObjectId | string>(
            field,
            finalValue
        );
    }
}
