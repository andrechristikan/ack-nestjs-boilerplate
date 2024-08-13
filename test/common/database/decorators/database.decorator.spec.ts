import {
    InjectConnection,
    InjectModel,
    Prop,
    Schema,
    SchemaFactory,
} from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import {
    DatabaseConnection,
    DatabaseEntity,
    DatabaseModel,
    DatabaseProp,
    DatabaseQueryAnd,
    DatabaseQueryContain,
    DatabaseQueryEqual,
    DatabaseQueryIn,
    DatabaseQueryNin,
    DatabaseQueryNotEqual,
    DatabaseQueryOr,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';

jest.mock('@nestjs/mongoose', () => ({
    ...jest.requireActual('@nestjs/mongoose'),
    InjectConnection: jest.fn(),
    InjectModel: jest.fn(),
    Schema: jest.fn(),
    SchemaFactory: {
        createForClass: jest.fn(),
    },
    Prop: jest.fn(),
}));

describe('Database Decorators', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('DatabaseConnection', () => {
        it('Should return applyDecorators', async () => {
            DatabaseConnection();

            expect(InjectConnection).toHaveBeenCalledWith(
                DATABASE_CONNECTION_NAME
            );
        });

        it('Should return applyDecorators with options', async () => {
            DatabaseConnection('test-connection');

            expect(InjectConnection).toHaveBeenCalledWith('test-connection');
        });
    });

    describe('DatabaseModel', () => {
        it('Should return applyDecorators', async () => {
            DatabaseModel('entity-name');

            expect(InjectModel).toHaveBeenCalledWith(
                'entity-name',
                DATABASE_CONNECTION_NAME
            );
        });

        it('Should return applyDecorators with options', async () => {
            DatabaseModel('entity-name', 'test-connection');

            expect(InjectModel).toHaveBeenCalledWith(
                'entity-name',
                'test-connection'
            );
        });
    });

    describe('DatabaseEntity', () => {
        it('Should return applyDecorators', async () => {
            DatabaseEntity();

            expect(Schema).toHaveBeenCalledWith({
                timestamps: {
                    createdAt: true,
                    updatedAt: true,
                },
            });
        });

        it('Should return applyDecorators with options', async () => {
            DatabaseEntity({
                _id: false,
            });

            expect(Schema).toHaveBeenCalledWith({
                _id: false,
                timestamps: {
                    createdAt: true,
                    updatedAt: true,
                },
            });
        });
    });

    describe('DatabaseProp', () => {
        it('Should return applyDecorators', async () => {
            DatabaseProp();

            expect(Prop).toHaveBeenCalled();
        });

        it('Should return applyDecorators with options', async () => {
            DatabaseProp({
                _id: false,
            });

            expect(Prop).toHaveBeenCalledWith({
                _id: false,
            });
        });
    });

    describe('DatabaseSchema', () => {
        it('Should return a mongoose schema', async () => {
            DatabaseSchema({} as any);

            expect(SchemaFactory.createForClass).toHaveBeenCalledWith({});
        });
    });

    describe('DatabaseQueryIn', () => {
        it('Should convert query request to mongodb query', async () => {
            const result = DatabaseQueryIn('test', ['name', 'status']);

            expect(result).toEqual({
                test: {
                    $in: ['name', 'status'],
                },
            });
        });
    });

    describe('DatabaseQueryNin', () => {
        it('Should convert query request to mongodb query', async () => {
            const result = DatabaseQueryNin('test', ['name', 'status']);

            expect(result).toEqual({
                test: {
                    $nin: ['name', 'status'],
                },
            });
        });
    });

    describe('DatabaseQueryEqual', () => {
        it('Should convert query request to mongodb query', async () => {
            const result = DatabaseQueryEqual('test', 'name');

            expect(result).toEqual({
                test: 'name',
            });
        });
    });

    describe('DatabaseQueryNotEqual', () => {
        it('Should convert query request to mongodb query', async () => {
            const result = DatabaseQueryNotEqual('test', 'name');

            expect(result).toEqual({
                test: {
                    $ne: 'name',
                },
            });
        });
    });

    describe('DatabaseQueryContain', () => {
        it('Should convert query request to mongodb query', async () => {
            const result = DatabaseQueryContain('test', 'name');

            expect(result).toEqual({
                test: {
                    $regex: new RegExp('name'),
                    $options: 'i',
                },
            });
        });

        it('Should convert query request to mongodb query with full match', async () => {
            const result = DatabaseQueryContain('test', 'name', {
                fullWord: true,
            });

            expect(result).toEqual({
                test: {
                    $regex: new RegExp('\\bname\\b'),
                    $options: 'i',
                },
            });
        });
    });

    describe('DatabaseQueryOr', () => {
        it('Should convert query request to mongodb query', async () => {
            const result = DatabaseQueryOr([]);

            expect(result).toEqual({
                $or: [],
            });
        });
    });

    describe('DatabaseQueryAnd', () => {
        it('Should convert query request to mongodb query', async () => {
            const result = DatabaseQueryAnd([]);

            expect(result).toEqual({
                $and: [],
            });
        });
    });
});
