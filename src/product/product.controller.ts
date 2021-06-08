import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    DefaultValuePipe,
    ParseIntPipe,
    Query,
    Delete,
    Param,
    BadRequestException,
    ParseBoolPipe,
    InternalServerErrorException
} from '@nestjs/common';
import { ResponseService } from 'src/response/response.service';
import { Message } from 'src/message/message.decorator';
import { MessageService } from 'src/message/message.service';
import { Response, ResponseStatusCode } from 'src/response/response.decorator';
import { IResponse } from 'src/response/response.interface';
import { AuthJwtGuard } from 'src/auth/auth.decorator';
import { PermissionList } from 'src/permission/permission.constant';
import { Permissions } from 'src/permission/permission.decorator';
import { ProductService } from './product.service';
import { PaginationService } from 'src/pagination/pagination.service';
import { Pagination } from 'src/pagination/pagination.decorator';
import { ProductDocument } from './product.interface';
import { PAGE, PER_PAGE } from 'src/pagination/pagination.constant';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'src/logger/logger.decorator';

@Controller('/product')
export class ProductController {
    constructor(
        @Response() private readonly responseService: ResponseService,
        @Message() private readonly messageService: MessageService,
        @Pagination() private readonly paginationService: PaginationService,
        @Logger() private readonly logger: LoggerService,
        private readonly productService: ProductService
    ) {}

    @AuthJwtGuard()
    @Permissions(PermissionList.ProductRead)
    @ResponseStatusCode()
    @Get('/')
    async findAll(
        @Query('page', new DefaultValuePipe(PAGE), ParseIntPipe) page: number,
        @Query('perPage', new DefaultValuePipe(PER_PAGE), ParseIntPipe)
        perPage: number
    ): Promise<IResponse> {
        const skip = await this.paginationService.skip(page, perPage);
        const products: ProductDocument[] = await this.productService.findAll(
            skip,
            perPage
        );
        const totalData: number = await this.productService.totalData();
        const totalPage = await this.paginationService.totalPage(
            totalData,
            perPage
        );

        return this.responseService.paging(
            this.messageService.get('product.findAll.success'),
            totalData,
            totalPage,
            page,
            perPage,
            products
        );
    }

    @AuthJwtGuard()
    @Permissions(PermissionList.ProductRead, PermissionList.ProductUpdate)
    @ResponseStatusCode()
    @Delete('/delete/:productId')
    async delete(@Param('productId') productId: string): Promise<IResponse> {
        const product: ProductDocument = await this.productService.findOneById(
            productId
        );
        if (!product) {
            this.logger.error('user Error', {
                class: 'ProductController',
                function: 'delete'
            });

            throw new BadRequestException(
                this.responseService.error(
                    this.messageService.get('http.clientError.notFound')
                )
            );
        }

        await this.productService.deleteOneById(productId);
        return this.responseService.success(
            this.messageService.get('product.delete.success')
        );
    }

    @AuthJwtGuard()
    @ResponseStatusCode()
    @Get('/list')
    async list(
        @Query('page', new DefaultValuePipe(PAGE), ParseIntPipe) page: number,
        @Query('perPage', new DefaultValuePipe(PER_PAGE), ParseIntPipe)
        perPage: number
    ): Promise<IResponse> {
        const skip = await this.paginationService.skip(page, perPage);
        const find = { isActive: true };
        const products: ProductDocument[] = await this.productService.findAll(
            skip,
            perPage,
            find
        );
        const totalData: number = await this.productService.totalData(find);
        const totalPage = await this.paginationService.totalPage(
            totalData,
            perPage
        );

        return this.responseService.paging(
            this.messageService.get('product.list.success'),
            totalData,
            totalPage,
            page,
            perPage,
            products
        );
    }

    @AuthJwtGuard()
    @Permissions(PermissionList.ProductRead, PermissionList.ProductUpdate)
    @ResponseStatusCode()
    @Post('/create')
    async create(
        @Body()
        data: Record<string, any>
    ): Promise<IResponse> {
        try {
            const user: ProductDocument = await this.productService.create(
                data
            );
            return this.responseService.success(
                this.messageService.get('product.create.success'),
                user
            );
        } catch (err: any) {
            this.logger.error('create try catch', {
                class: 'UserController',
                function: 'create',
                error: err
            });
            throw new InternalServerErrorException(
                this.responseService.error(
                    this.messageService.get(
                        'http.serverError.internalServerError'
                    )
                )
            );
        }
    }
}
