import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { SubscriptionService } from './subscription.service';
import { Subscription } from './schemas/subscription.schema';
import { PlanId, PLANS } from './plans.constant';

const userId = new Types.ObjectId().toHexString();

const mockActiveSubscription = {
  _id: new Types.ObjectId(),
  userId: new Types.ObjectId(userId),
  planId: PlanId.BASIC,
  status: 'active',
  save: jest.fn(),
};

const mockSubscriptionModel = {
  findOne: jest.fn(),
};

type MockSubscriptionModelType = jest.Mock<{ save: jest.Mock }, [unknown]> & {
  findOne: jest.Mock;
};

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let saveMock: jest.Mock;
  let module: TestingModule;

  beforeEach(async () => {
    saveMock = jest.fn().mockResolvedValue(mockActiveSubscription);

    const MockModel = jest
      .fn()
      .mockImplementation(() => ({ save: saveMock })) as MockSubscriptionModelType;
    MockModel.findOne = mockSubscriptionModel.findOne;

    module = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: getModelToken(Subscription.name),
          useValue: MockModel,
        },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
  });

  afterEach(() => jest.clearAllMocks());

  afterAll(async () => {
    await module.close();
  });

  describe('getPlans', () => {
    it('should return the list of plans', () => {
      const result = service.getPlans();
      expect(result).toEqual(PLANS);
    });
  });

  describe('getSubscription', () => {
    it('should return the subscription for the user', async () => {
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockActiveSubscription),
      });

      const result = await service.getSubscription(userId);

      expect(mockSubscriptionModel.findOne).toHaveBeenCalledWith({
        userId: new Types.ObjectId(userId),
      });
      expect(result).toEqual(mockActiveSubscription);
    });

    it('should throw NotFoundException when no subscription exists', async () => {
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getSubscription(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel an active subscription', async () => {
      const sub = { ...mockActiveSubscription, status: 'active', save: jest.fn().mockResolvedValue({ ...mockActiveSubscription, status: 'cancelled' }) };
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(sub),
      });

      const result = await service.cancelSubscription(userId);

      expect(sub.status).toBe('cancelled');
      expect(sub.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when there is no active subscription', async () => {
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.cancelSubscription(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createSubscription', () => {
    it('should create and return a new subscription', async () => {
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.createSubscription(userId, PlanId.BASIC);

      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual(mockActiveSubscription);
    });

    it('should throw BadRequestException when an active subscription already exists', async () => {
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockActiveSubscription),
      });

      await expect(
        service.createSubscription(userId, PlanId.BASIC),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
