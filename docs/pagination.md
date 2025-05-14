# Overview

The Pagination module provides a standardized approach to implementing data pagination throughout the application. It offers a set of tools for handling page-based data retrieval, sorting, filtering, and search functionality. The module is designed to work seamlessly with the [Response module](response.md) to provide consistent API responses for paginated data.

This documentation explains the features and usage of:
- **Pagination Module**: Located at `src/common/pagination`

# Table of Contents

- [Overview](#overview)
- [Table of Contents](#table-of-contents)
  - [Module](#module)
    - [Services](#services)
    - [Decorators](#decorators)
    - [Pipes](#pipes)
    - [DTOs](#dtos)
  - [Using Pagination](#using-pagination)
    - [Basic Implementation](#basic-implementation)
    - [Database Integration](#database-integration)
    - [Advanced Filtering](#advanced-filtering)
    - [Complete Example](#complete-example)

## Module

The Pagination module is a global module that is automatically imported and configured in the application. It provides a comprehensive set of tools for pagination, filtering, and ordering.

### Services

- **PaginationService**: service that handles page calculation, offset calculation, and order processing.
  - `offset(page, perPage)`: Calculates the offset based on page number and page size
  - `totalPage(totalData, perPage)`: Calculates the total number of pages
  - `page(page)`: Validates and normalizes the page number (maximum: 20)
  - `perPage(perPage)`: Validates and normalizes the items per page (maximum: 100)
  - `order(orderBy, orderDirection, availableOrderBy)`: Processes ordering parameters
  - `search(searchValue, availableSearch)`: Processes search parameters and returns a MongoDB query object

### Decorators

The module provides several decorators to simplify controller implementation:

- **@PaginationQuery(options?)**: Main decorator for handling pagination parameters including search, paging, and ordering
  - `options.defaultPerPage`: Set default items per page (default: 20)
  - `options.defaultOrderBy`: Set default field to order by (default: 'createdAt') 
  - `options.defaultOrderDirection`: Set default order direction (default: 'asc')
  - `options.availableSearch`: Array of fields available for searching
  - `options.availableOrderBy`: Array of fields available for ordering

- **@PaginationQueryFilterEqual(field, options?)**: Filter by exact match
  - `field`: Database field to filter
  - `options.queryField`: Custom query parameter name (defaults to field name)
  - `options.raw`: Return raw value instead of MongoDB query if true
  - `options.isNumber`: Convert string value to number if true

- **@PaginationQueryFilterNotEqual(field, options?)**: Filter by not equal match
  - `field`: Database field to filter
  - `options.queryField`: Custom query parameter name (defaults to field name)
  - `options.raw`: Return raw value instead of MongoDB query if true
  - `options.isNumber`: Convert string value to number if true

- **@PaginationQueryFilterStringContain(field, options?)**: Filter strings containing a value
  - `field`: Database field to filter
  - `options.queryField`: Custom query parameter name (defaults to field name)
  - `options.raw`: Return raw value instead of MongoDB query if true

- **@PaginationQueryFilterInBoolean(field, defaultValue, options?)**: Filter by boolean values in an array
  - `field`: Database field to filter
  - `defaultValue`: Default boolean array if not provided
  - `options.queryField`: Custom query parameter name (defaults to field name)
  - `options.raw`: Return raw value instead of MongoDB query if true

- **@PaginationQueryFilterInEnum(field, defaultValue, enumObject, options?)**: Filter by enum values in an array
  - `field`: Database field to filter
  - `defaultValue`: Default enum value(s) to use if the query parameter is empty or not provided
  - `enumObject`: Enum object containing all possible values
  - `options.queryField`: Custom query parameter name (defaults to field name)
  - `options.raw`: Return raw value instead of MongoDB query if true

- **@PaginationQueryFilterNinEnum(field, defaultValue, enumObject, options?)**: Filter by enum values not in an array
  - `field`: Database field to filter
  - `defaultValue`: Default enum value(s) to use if the query parameter is empty or not provided
  - `enumObject`: Enum object containing all possible values
  - `options.queryField`: Custom query parameter name (defaults to field name)
  - `options.raw`: Return raw value instead of MongoDB query if true

- **@PaginationQueryFilterDateBetween(fieldStart, fieldEnd, options?)**: Filter dates between two values
  - `fieldStart`: Start date database field
  - `fieldEnd`: End date database field
  - `options.queryFieldStart`: Custom query parameter name for start date
  - `options.queryFieldEnd`: Custom query parameter name for end date

### Pipes

The pagination pipes transform raw HTTP query parameters into MongoDB query operators through the DatabaseService. Each pipe serves a specific filtering purpose:

- **PaginationSearchPipe**: Processes search parameters and converts them into MongoDB `$or` queries with `$regex` operators for searching across multiple fields
- **PaginationPagingPipe**: Transforms pagination parameters (page, perPage) into MongoDB's `limit` and `skip` operators via the `_limit` and `_offset` properties
- **PaginationOrderPipe**: Converts sorting parameters into MongoDB's sort syntax using the `sort()` method
- **PaginationFilterEqualPipe**: Creates exact match queries using MongoDB's equality operator (`field: value`)
- **PaginationFilterNotEqualPipe**: Creates not-equal queries using MongoDB's `$ne` operator
- **PaginationFilterStringContainPipe**: Generates string containment queries using MongoDB's `$regex` operator with case-insensitive matching
- **PaginationFilterInBooleanPipe**: Creates boolean array inclusion queries using MongoDB's `$in` operator for boolean values
- **PaginationFilterInEnumPipe**: Creates enum array inclusion queries using MongoDB's `$in` operator for enum values
- **PaginationFilterNinEnumPipe**: Creates enum array exclusion queries using MongoDB's `$nin` (not in) operator
- **PaginationFilterDateBetweenPipe**: Generates date range queries using MongoDB's `$gte` and `$lte` operators

Each pipe adds its processed parameters to the request instance through the `__pagination` property, making them available throughout the request lifecycle, and returns the appropriate MongoDB query object that can be merged with other filters.

### DTOs

- **PaginationListDto**: Data transfer object for pagination parameters with the following properties:
  - `_search`: Search criteria record
  - `_limit`: Number of items per page
  - `_offset`: Offset for pagination
  - `_order`: Order specifications (field-direction mapping)
  - `_availableOrderBy`: Array of fields available for ordering
  - `_availableOrderDirection`: Array of available order directions
  - `perPage`: Number of items per page (optional)
  - `page`: Current page number (optional)
  - `orderBy`: Field to order by (optional)
  - `orderDirection`: Direction of ordering (optional)

## Using Pagination

### Basic Implementation

To implement pagination in a controller endpoint:

1. Import the required decorators and DTOs:
```typescript
import { PaginationQuery } from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { IResponsePaging } from 'src/common/response/interfaces/response.interface';
import { ResponsePaging } from 'src/common/response/decorators/response.decorator';
```

2. Inject the PaginationService in your controller constructor:
```typescript
constructor(
  private readonly paginationService: PaginationService,
  private readonly yourEntityService: YourEntityService
) {}
```

3. Use the @PaginationQuery() decorator on your endpoint with @ResponsePaging:
```typescript
@ResponsePaging('entity.list')
@Get('/list')
async list(
    @PaginationQuery({ 
      availableSearch: ['name', 'description'], 
      availableOrderBy: ['createdAt', 'name'] 
    }) 
    { _search, _limit, _offset, _order }: PaginationListDto
): Promise<IResponsePaging<YourEntityDto>> {
    // Implement query with search parameters
    const find: Record<string, any> = {
        ..._search,
    };

    // Call service with pagination parameters
    const entities = await this.yourEntityService.findAll(find, {
        paging: {
            limit: _limit,
            offset: _offset,
        },
        order: _order,
    });
    
    // Get total count for pagination
    const total = await this.yourEntityService.getTotal(find);
    const totalPage = this.paginationService.totalPage(total, _limit);

    // Map results to DTOs if needed
    const mappedEntities = this.yourEntityService.mapToDto(entities);

    // Return paginated response
    return {
        _pagination: { total, totalPage },
        data: mappedEntities,
    };
}
```

### Database Integration

The pagination module integrates seamlessly with the database module through the `DatabaseService`. Each pagination filter decorator internally uses the corresponding database helper method:

- `@PaginationQueryFilterEqual` uses `databaseService.filterEqual()`
- `@PaginationQueryFilterNotEqual` uses `databaseService.filterNotEqual()`
- `@PaginationQueryFilterStringContain` uses `databaseService.filterContain()`
- `@PaginationQueryFilterInBoolean` and `@PaginationQueryFilterInEnum` use `databaseService.filterIn()`
- `@PaginationQueryFilterNinEnum` uses `databaseService.filterNin()`
- `@PaginationQueryFilterDateBetween` uses `databaseService.filterDateBetween()`

The search functionality in `PaginationService` uses the `DatabaseHelperQueryContain` decorator to create MongoDB `$regex` queries with case-insensitive matching for the specified search fields.

### Advanced Filtering

For more advanced filtering, you can combine multiple pagination query decorators:

```typescript
@ResponsePaging('user.list')
@Get('/list')
async list(
    @PaginationQuery({ 
      availableSearch: ['email', 'firstName', 'lastName'],
      availableOrderBy: ['email', 'createdAt']
    }) paginationQuery: PaginationListDto,
    @PaginationQueryFilterEqual('isActive', { isNumber: false }) isActive: Record<string, any>,
    @PaginationQueryFilterStringContain('firstName') firstName: Record<string, any>,
    @PaginationQueryFilterInEnum('role', [], ENUM_USER_ROLE, { 
      queryField: 'roles' 
    }) roles: Record<string, any>,
    @PaginationQueryFilterDateBetween('createdAt', 'createdAt', {
      queryFieldStart: 'startDate',
      queryFieldEnd: 'endDate'
    }) dateRange: Record<string, any>
) {
    const { _search, _limit, _offset, _order } = paginationQuery;
    
    // Combine all filters
    const find: Record<string, any> = {
        ..._search,
        ...isActive,
        ...firstName,
        ...roles,
        ...dateRange
    };

    // Rest of implementation
}
```

### Complete Example

Here's a complete example from a role controller:

```typescript
@ApiTags('modules.system.role')
@Controller({
    version: '1',
    path: '/role',
})
export class RoleSystemController {
    constructor(
        private readonly paginationService: PaginationService,
        private readonly roleService: RoleService
    ) {}

    @ResponsePaging('role.list')
    @Get('/list')
    async list(
        @PaginationQuery({ availableSearch: ['name', 'description'] })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterInEnum(
            'type',
            [ENUM_POLICY_ROLE_TYPE.ADMIN, ENUM_POLICY_ROLE_TYPE.USER], // Default values if query param is empty
            ENUM_POLICY_ROLE_TYPE
        )
        type: Record<string, any>
    ): Promise<IResponsePaging<RoleListDto>> {
        const find: Record<string, any> = {
            ..._search,
            ...type,
        };

        const roles = await this.roleService.findAll(find, {
            paging: {
                limit: _limit,
                offset: _offset,
            },
            order: _order,
        });
        
        const total = await this.roleService.getTotal(find);
        const totalPage = this.paginationService.totalPage(total, _limit);

        const mappedRoles = this.roleService.mapToList(roles);

        return {
            _pagination: { total, totalPage },
            data: mappedRoles,
        };
    }
}
```
