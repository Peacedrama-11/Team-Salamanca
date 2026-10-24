import type { LabourMarketData, LabourMarketObservation } from "@workspace/api-zod";

export type { LabourMarketData, LabourMarketObservation };

export type WorkforceRecordSource = {
  sourceName: string;
  sourceUrl: string;
  country: string;
  retrievedAt: string;
  reportingPeriod: string | null;
};

export type OfficialLabourMarketRecord = WorkforceRecordSource & {
  kind: "official-labour-market-statistics";
  datasetId: "lfs_month";
  observation: LabourMarketObservation;
};

export type CurrentJobAdvertisement = WorkforceRecordSource & {
  kind: "current-job-advertisement";
  title: string;
  employer: string;
  location: string | null;
  postedAt: string | null;
  applicationUrl: string;
};

export type AiWorkforceNewsSignal = WorkforceRecordSource & {
  kind: "ai-workforce-news-signal";
  title: string;
  summary: string;
  publishedAt: string | null;
  originalUrl: string;
};

export type OccupationAndSkillsRecord = WorkforceRecordSource & {
  kind: "occupation-and-skills";
  occupationCode: string;
  occupationTitle: string;
  skills: string[];
};

export type LearningResourceRecord = WorkforceRecordSource & {
  kind: "learning-resource";
  title: string;
  provider: string;
  url: string;
  relatedSkills: string[];
  credentialStatus: "verified" | "unverified";
};

export type WorkforceDataRecord =
  | OfficialLabourMarketRecord
  | CurrentJobAdvertisement
  | AiWorkforceNewsSignal
  | OccupationAndSkillsRecord
  | LearningResourceRecord;

export type CareerRecommendationInput = {
  currentSkills: string[];
  targetOccupationCode: string;
};

export type VerifiedLearningRecommendation = {
  title: string;
  provider: string;
  url: string;
  relatedSkill: string;
  credentialStatus: "verified";
};

export type CareerRecommendation = {
  compatibilityScore: number;
  explanation: string[];
  skillGaps: string[];
  learningActivities: VerifiedLearningRecommendation[];
};

export interface CareerRecommendationService {
  recommend(input: CareerRecommendationInput): Promise<CareerRecommendation>;
}
