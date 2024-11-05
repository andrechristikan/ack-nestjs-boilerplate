import { Inject, Injectable, mixin, Type } from '@nestjs/common';
import { PipeTransform, Scope } from '@nestjs/common/interfaces';
import { REQUEST } from '@nestjs/core';
import { DatabaseService } from 'src/common/database/services/database.service';
import { ENUM_HELPER_DATE_DAY_OF } from 'src/common/helper/enums/helper.enum';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { IPaginationFilterDateBetweenOptions } from 'src/common/pagination/interfaces/pagination.interface';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

export function PaginationFilterDateBetweenPipe(
    fieldStart: string,
    fieldEnd: string,
    options?: IPaginationFilterDateBetweenOptions
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationFilterDatePipe implements PipeTransform {
        constructor(
            @Inject(REQUEST) protected readonly request: IRequestApp,
            private readonly databaseService: DatabaseService,
            private readonly helperDateService: HelperDateService
        ) {}

        async transform(): Promise<any> {
            const finalFieldStart = options?.queryFieldStart ?? fieldStart;
            const finalFieldEnd = options?.queryFieldEnd ?? fieldEnd;
            const { body } = this.request;

            if (!body[finalFieldStart] || !body[finalFieldEnd]) {
                return;
            }

            const finalStartValue: Date = this.helperDateService.createFromIso(
                body[finalFieldStart],
                {
                    dayOf: ENUM_HELPER_DATE_DAY_OF.START,
                }
            );
            const finalEndValue: Date = this.helperDateService.createFromIso(
                body[finalFieldEnd],
                { dayOf: ENUM_HELPER_DATE_DAY_OF.END }
            );

            this.addToRequestInstance(finalStartValue, finalEndValue);
            return this.databaseService.filterDateBetween(
                fieldStart,
                fieldEnd,
                finalStartValue,
                finalEndValue
            );
        }

        addToRequestInstance(startValue: Date, endValue: Date): void {
            const finalFieldStart = options?.queryFieldStart ?? fieldStart;
            const finalFieldEnd = options?.queryFieldEnd ?? fieldEnd;

            this.request.__pagination = {
                ...this.request.__pagination,
                filters: this.request.__pagination?.filters
                    ? {
                          ...this.request.__pagination?.filters,
                          [finalFieldStart]: startValue,
                          [finalFieldEnd]: endValue,
                      }
                    : {
                          [finalFieldStart]: startValue,
                          [finalFieldEnd]: endValue,
                      },
            };
        }
    }

    return mixin(MixinPaginationFilterDatePipe);
}
