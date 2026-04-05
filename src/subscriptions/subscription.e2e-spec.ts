import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { StripeService } from '../subscriptions/stripe.service';

describe('Subscriptions (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;
  const testEmail = `e2e-${Date.now()}@test.com`;

  const mockStripeService = {
    createCheckoutSession: jest
      .fn()
      .mockResolvedValue('https://checkout.stripe.com/test-session'),
    constructWebhookEvent: jest.fn(),
    cancelSubscription: jest.fn().mockResolvedValue({}),
    getSubscription: jest.fn().mockResolvedValue({
      current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(StripeService)
      .useValue(mockStripeService)
      .compile();

    app = moduleFixture.createNestApplication({
      rawBody: true,
    });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    // Register and login
    await request(app.getHttpServer())
      .post('/register')
      .send({ email: testEmail, password: 'password123' });

    const loginRes = await request(app.getHttpServer())
      .post('/login')
      .send({ email: testEmail, password: 'password123' });

    jwtToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /plans', () => {
    it('should return all plans', () => {
      return request(app.getHttpServer())
        .get('/plans')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveLength(3);
          expect(res.body[0]).toHaveProperty('stripePriceId');
        });
    });
  });

  describe('POST /subscription/checkout', () => {
    it('should reject without auth', () => {
      return request(app.getHttpServer())
        .post('/subscription/checkout')
        .send({ planId: 'basic' })
        .expect(401);
    });

    it('should reject invalid planId', () => {
      return request(app.getHttpServer())
        .post('/subscription/checkout')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ planId: 'invalid' })
        .expect(400);
    });

    it('should return checkout URL for valid plan', () => {
      return request(app.getHttpServer())
        .post('/subscription/checkout')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ planId: 'basic' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('url');
          expect(res.body.url).toContain('stripe.com');
        });
    });
  });

  describe('POST /webhook', () => {
    it('should reject invalid signature', () => {
      mockStripeService.constructWebhookEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      return request(app.getHttpServer())
        .post('/webhook')
        .set('stripe-signature', 'bad-sig')
        .set('Content-Type', 'application/json')
        .send('{}')
        .expect(400);
    });

    it('should process valid webhook event', () => {
      mockStripeService.constructWebhookEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'test-user', planId: 'basic' },
            subscription: 'sub_test',
            customer: 'cus_test',
          },
        },
      });

      return request(app.getHttpServer())
        .post('/webhook')
        .set('stripe-signature', 'valid-sig')
        .set('Content-Type', 'application/json')
        .send('{"type":"checkout.session.completed"}')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({ received: true });
        });
    });
  });

  describe('GET /subscription', () => {
    it('should reject without auth', () => {
      return request(app.getHttpServer()).get('/subscription').expect(401);
    });
  });

  describe('GET /subscription/all', () => {
    it('should reject for non-admin users', () => {
      return request(app.getHttpServer())
        .get('/subscription/all')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(403);
    });
  });
});
