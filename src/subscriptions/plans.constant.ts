import { capitalize } from 'lodash';

export enum PlanId {
  BASIC = 'basic',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}

export const PLANS = [
  {
    id: PlanId.BASIC,
    name: capitalize(PlanId.BASIC),
    price: 9.99,
    currency: 'USD',
    features: ['Up to 1 user', 'Basic support', '10 GB storage'],
  },
  {
    id: PlanId.STANDARD,
    name: capitalize(PlanId.STANDARD),
    price: 19.99,
    currency: 'USD',
    features: ['Up to 5 users', 'Priority support', '50 GB storage'],
  },
  {
    id: PlanId.PREMIUM,
    name: capitalize(PlanId.PREMIUM),
    price: 39.99,
    currency: 'USD',
    features: ['Unlimited users', '24/7 support', '500 GB storage'],
  },
];
