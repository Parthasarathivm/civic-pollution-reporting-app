export interface PlanFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

export interface CivicPlan {
  id: string;
  name: string;
  badge?: string;
  audience: string;
  description: string;
  priceMonthly: number;
  priceAnnual: number;
  billingPeriod: string;
  features: PlanFeature[];
  limits: {
    monthlyReports: string;
    monitoredWards: string;
    teamMembers: string;
    historicalData: string;
  };
  recommended?: boolean;
  ctaText: string;
  color: string;
}

export const CIVIC_PLANS: CivicPlan[] = [
  {
    id: "starter",
    name: "Civic Starter",
    audience: "Individual Citizens",
    description: "Empower individual civic participation with straightforward pollution reporting and tracking.",
    priceMonthly: 0,
    priceAnnual: 0,
    billingPeriod: "Forever Free",
    recommended: false,
    color: "#0ea5e9",
    ctaText: "Current Plan",
    limits: {
      monthlyReports: "Unlimited",
      monitoredWards: "1 Locality",
      teamMembers: "1 User",
      historicalData: "30 Days",
    },
    features: [
      { text: "Submit pollution reports with photo & GPS", included: true },
      { text: "Track personal report lifecycle & status", included: true },
      { text: "Public live map & cluster views", included: true },
      { text: "Basic environmental health overview", included: true },
      { text: "Standard in-app notifications", included: true },
      { text: "Neighborhood cluster alerts", included: false },
      { text: "Exportable CSV civic reports", included: false },
      { text: "Dedicated municipal liaison support", included: false },
    ],
  },
  {
    id: "plus",
    name: "Civic Plus",
    badge: "Most Popular",
    audience: "Active Citizens & Ward Stewards",
    description: "Deep environmental analytics and priority tracking for community champions and resident groups.",
    priceMonthly: 8,
    priceAnnual: 75,
    billingPeriod: "/ month",
    recommended: true,
    color: "#10b981",
    ctaText: "Upgrade to Plus",
    limits: {
      monthlyReports: "Unlimited",
      monitoredWards: "Up to 5 Wards",
      teamMembers: "1 User",
      historicalData: "12 Months",
    },
    features: [
      { text: "Everything in Civic Starter", included: true },
      { text: "Advanced environmental insights & trend charts", included: true, highlight: true },
      { text: "Saved monitoring zones with custom radius", included: true },
      { text: "Neighborhood recurring hotspot detection alerts", included: true, highlight: true },
      { text: "Priority report dispatch & tracking flag", included: true },
      { text: "Extended 12-month historical data archive", included: true },
      { text: "Team member delegation", included: false },
      { text: "Direct municipal GIS sync API", included: false },
    ],
  },
  {
    id: "impact",
    name: "Civic Impact",
    badge: "Organizations",
    audience: "Schools, NGOs & Resident Welfare Assns",
    description: "Comprehensive coordination dashboard for environmental NGOs, academic institutions, and local RWAs.",
    priceMonthly: 29,
    priceAnnual: 279,
    billingPeriod: "/ month",
    recommended: false,
    color: "#8b5cf6",
    ctaText: "Select Organization Plan",
    limits: {
      monthlyReports: "Unlimited",
      monitoredWards: "City-wide",
      teamMembers: "Up to 15 Members",
      historicalData: "3 Years",
    },
    features: [
      { text: "Everything in Civic Plus", included: true },
      { text: "Dedicated Organization Dashboard & team roles", included: true, highlight: true },
      { text: "Up to 15 team members with role permissions", included: true },
      { text: "Automated monthly civic impact & compliance PDF exports", included: true },
      { text: "Aggregated ward monitoring & hotspot reports", included: true },
      { text: "Community campaign coordination tools", included: true },
      { text: "Priority civic support response (< 12 hours)", included: true },
      { text: "Enterprise SLA & dedicated account manager", included: false },
    ],
  },
  {
    id: "intelligence",
    name: "Civic Intelligence",
    badge: "Enterprise / Gov",
    audience: "Municipal Corporations & Public Agencies",
    description: "Full-scale civic intelligence, automated worker routing, and institutional compliance suite.",
    priceMonthly: 99,
    priceAnnual: 950,
    billingPeriod: "/ month",
    recommended: false,
    color: "#06b6d4",
    ctaText: "Contact for Municipal Access",
    limits: {
      monthlyReports: "Unlimited",
      monitoredWards: "Full Jurisdiction",
      teamMembers: "Unlimited",
      historicalData: "Indefinite Archive",
    },
    features: [
      { text: "Everything in Civic Impact", included: true },
      { text: "Municipal fleet route optimizer (TSP Nearest Neighbor)", included: true, highlight: true },
      { text: "Computer-Vision AI verification & before/after audit", included: true, highlight: true },
      { text: "REST API & GIS GeoJSON streaming feeds", included: true },
      { text: "Custom municipal departmental dashboards", included: true },
      { text: "Citizen satisfaction metrics & SLA tracking", included: true },
      { text: "Dedicated municipal liaison & onboarding support", included: true },
      { text: "Audit log compliance & tamper-evident records", included: true },
    ],
  },
];

export function getPlanById(id: string): CivicPlan {
  return CIVIC_PLANS.find((p) => p.id === id) || CIVIC_PLANS[0];
}
