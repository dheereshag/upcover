import { capitalize } from 'lodash';

export enum PlanId {
  BASIC = 'basic',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  currency: string;
  stripePriceId: string;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: PlanId.BASIC,
    name: capitalize(PlanId.BASIC),
    price: 999,
    currency: 'USD',
    stripePriceId: 'price_1TIsexSC1VnJZOg6nSoyoZc2', // Basic $9.99/mo
    features: ['Up to 1 user', 'Basic support', '10 GB storage'],
  },
  {
    id: PlanId.STANDARD,
    name: capitalize(PlanId.STANDARD),
    price: 1999,
    currency: 'USD',
    stripePriceId: 'price_1TIsfqSC1VnJZOg6JXSBSEaX', // Standard $19.99/mo
    features: ['Up to 5 users', 'Priority support', '50 GB storage'],
  },
  {
    id: PlanId.PREMIUM,
    name: capitalize(PlanId.PREMIUM),
    price: 3999,
    currency: 'USD',
    stripePriceId: 'price_1TIsg9SC1VnJZOg6QFVHhYg9', // Premium $39.99/mo
    features: ['Unlimited users', '24/7 support', '500 GB storage'],
  },
];
