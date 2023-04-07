import { Inject, Injectable } from '@nestjs/common';
import {
    ArgumentMetadata,
    PipeTransform,
    Scope,
} from '@nestjs/common/interfaces';
import { REQUEST } from '@nestjs/core';
import { Types } from 'mongoose';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

@Injectable({ scope: Scope.REQUEST })
export class PaginationFilterEqualObjectIdPipe implements PipeTransform {
    constructor(
        @Inject(REQUEST) protected readonly request: IRequestApp,
        private readonly paginationService: PaginationService
    ) {}

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

        this.request.__filters = {
            ...this.request.__filters,
            [field]: value,
        };

        return this.paginationService.filterEqual<Types.ObjectId | string>(
            field,
            finalValue
        );
    }
}
