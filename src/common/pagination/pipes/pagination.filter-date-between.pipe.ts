import { Inject, Injectable, mixin, Type } from '@nestjs/common';
import { PipeTransform, Scope } from '@nestjs/common/interfaces';
import { REQUEST } from '@nestjs/core';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { IPaginationFilterDateBetweenOptions } from 'src/common/pagination/interfaces/pagination.interface';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
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
            private readonly paginationService: PaginationService,
            private readonly helperDateService: HelperDateService
        ) {}

        async transform(): Promise<any> {
            const finalFieldStart = options?.queryFieldStart ?? fieldStart;
            const finalFieldEnd = options?.queryFieldEnd ?? fieldEnd;
            const { body } = this.request;

            if (!body[finalFieldStart] || !body[finalFieldEnd]) {
                return;
            }

            const finalStartValue: Date = this.helperDateService.startOfDay(
                this.helperDateService.create(body[finalFieldStart])
            );
            const finalEndValue: Date = this.helperDateService.endOfDay(
                this.helperDateService.create(body[finalFieldEnd])
            );

            this.addToRequestInstance(finalStartValue, finalEndValue);
            return this.paginationService.filterDateBetween(
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
