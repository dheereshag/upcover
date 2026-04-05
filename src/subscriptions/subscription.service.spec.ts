import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { SubscriptionService } from './subscription.service';
import { StripeService } from './stripe.service';
import { UsersService } from '../users/users.service';
import { Subscription } from './schemas/subscription.schema';
import { PlanId } from './plans.constant';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let stripeService: Record<string, jest.Mock>;
  let usersService: Record<string, jest.Mock>;
  let subscriptionModel: any;

  const mockUserId = new Types.ObjectId().toHexString();

  const mockSubscriptionDoc = {
    _id: new Types.ObjectId(),
    userId: new Types.ObjectId(mockUserId),
    planId: PlanId.BASIC,
    status: 'active',
    stripeSubscriptionId: 'sub_123',
    stripeCustomerId: 'cus_123',
    save: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    const mockFindOne = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
      exec: jest.fn().mockResolvedValue(null),
    });

    const mockFind = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
    });

    subscriptionModel = Object.assign(
      jest.fn().mockImplementation((data: Record<string, unknown>) => ({
        ...data,
        save: jest
          .fn()
          .mockResolvedValue({ ...data, _id: new Types.ObjectId() }),
      })),
      {
        findOne: mockFindOne,
        find: mockFind,
      },
    );

    stripeService = {
      createCheckoutSession: jest
        .fn()
        .mockResolvedValue('https://checkout.stripe.com/session'),
      cancelSubscription: jest.fn().mockResolvedValue({}),
      getSubscription: jest.fn().mockResolvedValue({
        current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
      }),
      constructWebhookEvent: jest.fn(),
    };

    usersService = {
      findById: jest.fn().mockResolvedValue({
        _id: mockUserId,
        email: 'test@example.com',
      }),
      findByEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: getModelToken(Subscription.name),
          useValue: subscriptionModel,
        },
        { provide: StripeService, useValue: stripeService },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
  });

  describe('getPlans', () => {
    it('should return all plans', () => {
      const plans = service.getPlans();
      expect(plans).toHaveLength(3);
      expect(plans.map((p) => p.id)).toEqual([
        PlanId.BASIC,
        PlanId.STANDARD,
        PlanId.PREMIUM,
      ]);
    });
  });

  describe('getPlanById', () => {
    it('should return a plan by ID', () => {
      const plan = service.getPlanById(PlanId.BASIC);
      expect(plan.id).toBe(PlanId.BASIC);
    });

    it('should throw NotFoundException for invalid plan ID', () => {
      expect(() => service.getPlanById('invalid' as PlanId)).toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMySubscription', () => {
    it('should throw NotFoundException if no subscription exists', async () => {
      await expect(service.getMySubscription(mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return subscription when found', async () => {
      (subscriptionModel.findOne as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockSubscriptionDoc),
        }),
      });

      const result = await service.getMySubscription(mockUserId);
      expect(result.planId).toBe(PlanId.BASIC);
    });
  });

  describe('createCheckoutSession', () => {
    it('should throw BadRequestException if user already has active subscription', async () => {
      (subscriptionModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSubscriptionDoc),
      });

      await expect(
        service.createCheckoutSession(mockUserId, PlanId.BASIC),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user not found', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(
        service.createCheckoutSession(mockUserId, PlanId.BASIC),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return checkout URL on success', async () => {
      const result = await service.createCheckoutSession(
        mockUserId,
        PlanId.BASIC,
      );
      expect(result).toEqual({ url: 'https://checkout.stripe.com/session' });
      expect(stripeService.createCheckoutSession).toHaveBeenCalled();
    });
  });

  describe('cancelSubscription', () => {
    it('should throw NotFoundException if no active subscription', async () => {
      (subscriptionModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.cancelSubscription(mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should cancel subscription via Stripe and update DB', async () => {
      (subscriptionModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockSubscriptionDoc,
          save: jest.fn().mockResolvedValue({
            ...mockSubscriptionDoc,
            status: 'canceled',
          }),
        }),
      });

      await service.cancelSubscription(mockUserId);
      expect(stripeService.cancelSubscription).toHaveBeenCalledWith('sub_123');
    });
  });

  describe('getAllSubscriptions', () => {
    it('should return all subscriptions', async () => {
      const result = await service.getAllSubscriptions();
      expect(result).toEqual([]);
    });
  });
});
