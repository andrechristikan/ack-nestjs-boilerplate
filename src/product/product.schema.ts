import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class ProductEntity {
    @Prop({
        required: true,
        index: true,
        trim: true
    })
    name: string;

    @Prop({
        required: true
    })
    description: string;

    @Prop({
        required: true,
        default: 0
    })
    quantity: number;

    @Prop({
        required: true,
        default: true
    })
    isActive: boolean;
}

export const ProductDatabaseName = 'products';
export const ProductSchema = SchemaFactory.createForClass(ProductEntity);
