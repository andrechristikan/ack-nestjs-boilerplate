import { Inject } from '@nestjs/common';

export function Pagination(): (
    target: Record<string, any>,
    key: string | symbol,
    index?: number
) => void {
    return Inject(`PaginationService`);
}
