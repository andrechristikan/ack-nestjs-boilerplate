import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UrlencodedBodyParserMiddleware implements NestMiddleware {
    constructor(private readonly configService: ConfigService) {}

    use(req: Request, res: Response, next: NextFunction): void {
        bodyParser.urlencoded({
            extended: false,
            limit: this.configService.get<number>(
                'request.urlencoded.maxFileSize'
            ),
        })(req, res, next);
    }
}

@Injectable()
export class JsonBodyParserMiddleware implements NestMiddleware {
    constructor(private readonly configService: ConfigService) {}

    use(req: Request, res: Response, next: NextFunction): void {
        bodyParser.json({
            limit: this.configService.get<number>('request.json.maxFileSize'),
        })(req, res, next);
    }
}

@Injectable()
export class RawBodyParserMiddleware implements NestMiddleware {
    constructor(private readonly configService: ConfigService) {}

    use(req: Request, res: Response, next: NextFunction): void {
        bodyParser.raw({
            limit: this.configService.get<number>('request.raw.maxFileSize'),
        })(req, res, next);
    }
}

@Injectable()
export class TextBodyParserMiddleware implements NestMiddleware {
    constructor(private readonly configService: ConfigService) {}

    use(req: Request, res: Response, next: NextFunction): void {
        bodyParser.text({
            limit: this.configService.get<number>('request.text.maxFileSize'),
        })(req, res, next);
    }
}
