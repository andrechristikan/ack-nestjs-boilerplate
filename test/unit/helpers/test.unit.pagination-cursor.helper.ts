import type { PaginationCursorQueryDto } from '@common/pagination/dtos/pagination.cursor-query.dto';

export type ITestPaginationCursorDto = PaginationCursorQueryDto &
    Record<string, unknown>;
