import type { PaginationCursorQueryDto } from '@common/pagination/dtos/pagination.cursor-query.dto';

export type TestPaginationCursorDto = PaginationCursorQueryDto &
    Record<string, unknown>;
