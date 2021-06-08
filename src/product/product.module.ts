import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import {
    ProductDatabaseName,
    ProductEntity,
    ProductSchema
} from './product.schema';

@Module({
    controllers: [ProductController],
    providers: [ProductService],
    exports: [ProductService],
    imports: [
        MongooseModule.forFeature([
            {
                name: ProductEntity.name,
                schema: ProductSchema,
                collection: ProductDatabaseName
            }
        ])
    ]
})
export class ProductModule {}
