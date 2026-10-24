import type { CvProfile, CvSkillDefinition } from "@workspace/api-zod";

// A deliberately finite dictionary: absence is not proof a person lacks a skill.
export const skillDictionary: CvSkillDefinition[] = [
  ["JavaScript", "JS", "ECMAScript"], ["TypeScript", "TS"], ["Python"],
  ["Java"], ["C++", "CPP"], ["C#","C sharp"], ["C"], ["Go", "Golang"],
  ["R"], ["Ruby"], ["PHP"], ["Swift"], ["Kotlin"], ["Rust"], ["Dart"],
  ["HTML", "HTML5"], ["CSS", "CSS3"], ["React", "React.js", "ReactJS"],
  ["Angular", "AngularJS"], ["Vue", "Vue.js", "VueJS"], ["Next.js", "NextJS"],
  ["Node.js", "NodeJS", "Node"], ["Express", "Express.js"], ["Django"],
  ["Flask"], ["FastAPI"], ["Spring Boot"], ["ASP.NET", ".NET"],
  ["SQL"], ["PostgreSQL", "Postgres"], ["MySQL"], ["MongoDB"], ["Redis"],
  ["Git"], ["Linux"], ["Docker"], ["Kubernetes", "K8s"],
  ["AWS", "Amazon Web Services"], ["Azure", "Microsoft Azure"],
  ["Google Cloud", "GCP", "Google Cloud Platform"], ["Terraform"],
  ["CI/CD", "Continuous Integration"], ["Jenkins"], ["GitHub Actions"],
  ["REST", "REST APIs", "RESTful"], ["GraphQL"], ["Microservices"],
  ["Pandas"], ["NumPy"], ["TensorFlow"], ["PyTorch"], ["scikit-learn"],
  ["Machine Learning", "ML"], ["Data Analysis", "Data Analytics"],
  ["Excel", "Microsoft Excel"], ["Power BI", "PowerBI"], ["Tableau"],
  ["Apache Spark", "PySpark", "Spark"], ["Airflow", "Apache Airflow"],
  ["Figma"], ["UX Design", "User Experience Design"], ["UI Design"],
  ["Selenium"], ["Playwright"], ["Cypress"], ["Jest"], ["JUnit"],
  ["Agile"], ["Scrum"], ["Cybersecurity", "Cyber Security"],
].map(([name, ...aliases]) => ({ name: name!, aliases }));

const normal = (s: string) => s.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
const aliasMap = new Map(skillDictionary.flatMap(s => [s.name, ...s.aliases].map(a => [normal(a), s.name] as const)));
export function canonicalSkill(name: string): string {
  const clean = name.normalize("NFKC").trim().replace(/\s+/g, " ");
  return aliasMap.get(normal(clean)) ?? clean;
}
export function normalizeProfile(profile: CvProfile): CvProfile {
  const seen = new Set<string>();
  return {
    experienceYears: profile.experienceYears,
    skills: profile.skills.flatMap(s => {
      const name = canonicalSkill(s.name), key = normal(name);
      if (!name || seen.has(key)) return [];
      seen.add(key);
      return [{ name, level: s.level }];
    }),
  };
}
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const recognizers = skillDictionary.map(skill => ({
  name: skill.name,
  aliases: [skill.name, ...skill.aliases].map(alias => ({
    text: alias.toLowerCase(),
    pattern: new RegExp(`(?<![\\p{L}\\p{N}_+#])${escape(alias)}(?![\\p{L}\\p{N}_+#])`, ["R", "C", "Go"].includes(alias) ? "gu" : "giu"),
  })),
}));
export function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  return recognizers.filter(skill => skill.aliases.some(alias => {
    if (!lower.includes(alias.text)) return false;
    // Bare R/C/Go are case-sensitive. "C" must not match C++ or C#.
    return [...text.matchAll(alias.pattern)].some(match => {
      const prefix = text.slice(Math.max(0, match.index! - 70), match.index);
      return !/(?:\bno\b|\bnot\b|\bwithout\b|\black(?:s|ing)?\b)[^.;:\n]*$/i.test(prefix);
    });
  })).map(s => s.name);
}

// Only an explicit number tied to "experience" is evidence, not CV date arithmetic.
export function explicitExperience(text: string, useRangeMinimum = false): number | null {
  const values = new Set<number>();
  const patterns = [
    /\b(\d{1,2}(?:\.\d)?)\s*(\+|[-–]\s*\d{1,2})?\s*years?\s+(?:(?:of|professional|relevant|commercial|work|industry|total|overall)\s+){0,4}experience\b/gi,
    /\b(?:total\s+|overall\s+)?experience\s*:\s*(\d{1,2}(?:\.\d)?)\s*\+?\s*years?\b/gi,
  ];
  for (const pattern of patterns) for (const match of text.matchAll(pattern)) {
    const prefix = text.slice(Math.max(0, match.index! - 40), match.index);
    if (/\b(?:no|not|without)\b[^.;\n]*$/i.test(prefix)) continue;
    if (!useRangeMinimum && /[-–]/.test(match[2] ?? "")) return null;
    const value = Number(match[1]);
    if (value <= 80) values.add(value);
  }
  return values.size === 1 ? [...values][0]! : null;
}
