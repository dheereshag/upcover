import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Upcover API!';
  }

  getHealth(): { status: string } {
    return { status: 'ok' };
  }
}
