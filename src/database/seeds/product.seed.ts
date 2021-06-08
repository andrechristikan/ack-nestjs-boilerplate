import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'src/logger/logger.decorator';

import { PermissionService } from 'src/permission/permission.service';
import { ProductService } from 'src/product/product.service';

@Injectable()
export class ProductSeed {
    constructor(
        @Logger() private readonly logger: LoggerService,
        private readonly permissionService: PermissionService,
        private readonly productService: ProductService
    ) {}

    @Command({
        command: 'create:product',
        describe: 'insert products',
        autoExit: true
    })
    async create(): Promise<void> {
        try {
            await this.productService.createMany([
                {
                    name: 'apple',
                    description: 'fresh fruit 1',
                    quantity: 10,
                    isActive: true
                },
                {
                    name: 'banana',
                    description: 'fresh fruit 2',
                    quantity: 10,
                    isActive: true
                },
                {
                    name: 'orange',
                    description: 'fresh fruit 3',
                    quantity: 10,
                    isActive: true
                },
                {
                    name: 'pineapple',
                    description: 'future fresh fruit',
                    quantity: 20,
                    isActive: false
                }
            ]);

            this.logger.info('Insert Product Succeed', {
                class: 'ProductSeed',
                function: 'create'
            });
        } catch (e) {
            this.logger.error(e.message, {
                class: 'ProductSeed',
                function: 'create'
            });
        }
    }

    @Command({
        command: 'remove:product',
        describe: 'remove products',
        autoExit: true
    })
    async remove(): Promise<void> {
        try {
            await this.productService.deleteMany();

            this.logger.info('Remove Product Succeed', {
                class: 'ProductSeed',
                function: 'remove'
            });
        } catch (e) {
            this.logger.error(e.message, {
                class: 'ProductSeed',
                function: 'remove'
            });
        }
    }
}
