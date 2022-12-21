import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RequestUrlencodedBodyParserMiddleware implements NestMiddleware {
    private readonly maxFile: number;

    constructor(private readonly configService: ConfigService) {
        this.maxFile = this.configService.get<number>(
            'request.body.urlencoded.maxFileSize'
        );
    }

    use(req: Request, res: Response, next: NextFunction): void {
        bodyParser.urlencoded({
            extended: false,
            limit: this.maxFile,
        })(req, res, next);
    }
}

@Injectable()
export class RequestJsonBodyParserMiddleware implements NestMiddleware {
    private readonly maxFile: number;

    constructor(private readonly configService: ConfigService) {
        this.maxFile = this.configService.get<number>(
            'request.body.json.maxFileSize'
        );
    }

    use(req: Request, res: Response, next: NextFunction): void {
        bodyParser.json({
            limit: this.maxFile,
        })(req, res, next);
    }
}

@Injectable()
export class RequestRawBodyParserMiddleware implements NestMiddleware {
    private readonly maxFile: number;

    constructor(private readonly configService: ConfigService) {
        this.maxFile = this.configService.get<number>(
            'request.body.raw.maxFileSize'
        );
    }

    use(req: Request, res: Response, next: NextFunction): void {
        bodyParser.raw({
            limit: this.maxFile,
        })(req, res, next);
    }
}

@Injectable()
export class RequestTextBodyParserMiddleware implements NestMiddleware {
    private readonly maxFile: number;

    constructor(private readonly configService: ConfigService) {
        this.maxFile = this.configService.get<number>(
            'request.body.text.maxFileSize'
        );
    }

    use(req: Request, res: Response, next: NextFunction): void {
        bodyParser.text({
            limit: this.maxFile,
        })(req, res, next);
    }
}
