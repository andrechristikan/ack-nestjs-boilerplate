import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductEntity } from './product.schema';
import { ProductDocument } from './product.interface';

@Injectable()
export class ProductService {
    constructor(
        @InjectModel(ProductEntity.name)
        private readonly productModel: Model<ProductDocument>
    ) {}

    async findAll(
        offset: number,
        limit: number,
        find?: Record<string, any>
    ): Promise<ProductDocument[]> {
        return this.productModel.find(find).skip(offset).limit(limit).lean();
    }

    async totalData(find?: Record<string, any>): Promise<number> {
        return this.productModel.countDocuments(find);
    }

    async findOneById(productId: string): Promise<ProductDocument> {
        return this.productModel.findById(productId).lean();
    }

    async create(data: Record<string, any>): Promise<ProductDocument> {
        const create: ProductDocument = new this.productModel({
            name: data.name,
            description: data.description,
            quantity: data.quantity || 0,
            isActive: data.isActive || true
        });

        return create.save();
    }

    async createMany(data: Record<string, any>[]): Promise<boolean> {
        const newData = data.map((val: Record<string, any>) => ({
            name: val.name,
            description: val.description,
            quantity: val.quantity || 0,
            isActive: val.isActive || true
        }));

        return new Promise((resolve, reject) => {
            this.productModel
                .insertMany(newData)
                .then(() => {
                    resolve(true);
                })
                .catch((err: any) => {
                    reject(err);
                });
        });
    }

    async deleteMany(find?: Record<string, any>): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.productModel
                .deleteMany(find)
                .then(() => {
                    resolve(true);
                })
                .catch((err: any) => {
                    reject(err);
                });
        });
    }

    async deleteOneById(productId: string): Promise<ProductDocument> {
        return this.productModel.deleteOne({
            _id: productId
        });
    }

    async updateOneById(
        productId: string,
        data: Record<string, any>
    ): Promise<ProductDocument> {
        return this.productModel.updateOne(
            {
                _id: productId
            },
            {
                description: data.description,
                name: data.name,
                quantity: data.quantity,
                isActive: data.isActive
            }
        );
    }
}
