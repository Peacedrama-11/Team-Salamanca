export const questions = [
  {
    title: 'What interests you the most?',
    options: [
      'Building websites and applications',
      'Artificial intelligence and intelligent systems',
      'Working with data and discovering insights',
      'Cloud systems, infrastructure and security',
      'Designing great user experiences',
      'Mobile applications and games',
    ],
  },
  {
    title: 'What kind of work sounds most enjoyable?',
    options: [
      'Creating interfaces and visual experiences',
      'Writing application logic and APIs',
      'Analyzing data and finding patterns',
      'Building AI models or AI-powered features',
      'Deploying and maintaining systems',
      'Testing, securing and improving software',
    ],
  },
  {
    title: 'What is your current experience?',
    options: [
      'Complete beginner',
      'HTML, CSS or JavaScript',
      'Python or basic machine learning',
      'SQL, Excel or databases',
      'Linux, cloud or networking',
      'Some experience in another area',
    ],
  },
];

export type Answers = [number, number, number];
export type LearningPath = {
  id: string;
  name: string;
  description: string;
  url: string;
  interest: number[];
  activity: number[];
  experience: number[];
};

// Tags index the corresponding question's options. Experience is a small bonus,
// never an eligibility requirement; beginner and unrelated experience stay neutral.
export const learningPaths: LearningPath[] = [
  { id: 'frontend', name: 'Frontend Development', description: 'Build responsive, accessible web interfaces with HTML, CSS and JavaScript.', url: 'https://roadmap.sh/frontend?utm_source=chatgpt.com', interest: [0], activity: [0], experience: [1] },
  { id: 'backend', name: 'Backend Development', description: 'Create server-side application logic, APIs and database-backed services.', url: 'https://roadmap.sh/backend?utm_source=chatgpt.com', interest: [0], activity: [1], experience: [1, 2, 3] },
  { id: 'full-stack', name: 'Full Stack Development', description: 'Connect web interfaces and backend services to build complete applications.', url: 'https://roadmap.sh/full-stack?utm_source=chatgpt.com', interest: [0], activity: [0, 1], experience: [1, 3] },
  { id: 'ai-engineer', name: 'AI Engineering', description: 'Integrate AI models and tools into useful, reliable applications.', url: 'https://roadmap.sh/ai-engineer?utm_source=chatgpt.com', interest: [1], activity: [1, 3], experience: [1, 2] },
  { id: 'machine-learning', name: 'Machine Learning', description: 'Explore how models learn patterns from data and how to evaluate their predictions.', url: 'https://roadmap.sh/machine-learning?utm_source=chatgpt.com', interest: [1, 2], activity: [2, 3], experience: [2] },
  { id: 'ai-data-scientist', name: 'AI & Data Science', description: 'Combine statistics, data exploration and AI to investigate practical questions.', url: 'https://roadmap.sh/ai-data-scientist?utm_source=chatgpt.com', interest: [1, 2], activity: [2, 3], experience: [2, 3] },
  { id: 'data-analyst', name: 'Data Analytics', description: 'Explore data, answer questions and communicate insights with clear visualizations.', url: 'https://roadmap.sh/data-analyst?utm_source=chatgpt.com', interest: [2], activity: [2], experience: [2, 3] },
  { id: 'data-engineer', name: 'Data Engineering', description: 'Build pipelines and data systems that make information usable and dependable.', url: 'https://roadmap.sh/data-engineer?utm_source=chatgpt.com', interest: [2, 3], activity: [1, 4], experience: [2, 3, 4] },
  { id: 'devops', name: 'DevOps Engineering', description: 'Automate software delivery and operate cloud infrastructure and services.', url: 'https://roadmap.sh/devops?utm_source=chatgpt.com', interest: [3], activity: [4], experience: [4] },
  { id: 'mlops', name: 'MLOps Engineering', description: 'Deploy, monitor and maintain machine-learning models in production systems.', url: 'https://roadmap.sh/mlops?utm_source=chatgpt.com', interest: [1, 3], activity: [3, 4], experience: [2, 4] },
  { id: 'cyber-security', name: 'Cybersecurity', description: 'Understand threats and learn to protect software, networks and information.', url: 'https://roadmap.sh/cyber-security?utm_source=chatgpt.com', interest: [3], activity: [5], experience: [4] },
  { id: 'ux-design', name: 'UX Design', description: 'Research user needs and design clear, usable experiences and prototypes.', url: 'https://roadmap.sh/ux-design?utm_source=chatgpt.com', interest: [4], activity: [0], experience: [1] },
  { id: 'qa', name: 'Quality Assurance (QA)', description: 'Plan tests, investigate defects and help teams improve software quality.', url: 'https://roadmap.sh/qa?utm_source=chatgpt.com', interest: [0], activity: [5], experience: [1, 2] },
  { id: 'android', name: 'Android Development', description: 'Build mobile applications for Android devices, from interfaces to app behavior.', url: 'https://roadmap.sh/android?utm_source=chatgpt.com', interest: [5], activity: [0, 1], experience: [1] },
  { id: 'game-developer', name: 'Game Development', description: 'Create interactive games through gameplay programming, visuals and game systems.', url: 'https://roadmap.sh/game-developer?utm_source=chatgpt.com', interest: [5], activity: [0, 1], experience: [1] },
];

export function rankLearningPaths(answers: Answers) {
  if (answers.length !== 3 || answers.some((answer, index) => !Number.isInteger(answer) || !questions[index]?.options[answer])) {
    throw new Error('Answer all three questions before requesting recommendations.');
  }
  return learningPaths.map((path, order) => {
    const matches = [
      path.interest.includes(answers[0]),
      path.activity.includes(answers[1]),
      path.experience.includes(answers[2]),
    ];
    const reasons = matches.flatMap((match, index) => match
      ? [`${['Interest', 'Preferred activity', 'Existing experience'][index]}: ${questions[index].options[answers[index]]}.`]
      : []);
    return {
      path,
      score: (matches[0] ? 5 : 0) + (matches[1] ? 3 : 0) + (matches[2] ? 1 : 0),
      reasons: reasons.length ? reasons : ['An alternative to explore alongside your closer interest matches.'],
      order,
    };
  }).sort((a, b) => b.score - a.score || a.order - b.order);
}

export type LearningSelection = {
  pathId: string;
  addedAt: string;
  startedAt: string;
  stoppedAt: string | null;
  active: boolean;
};

export function addLearningPath(current: LearningSelection[], pathId: string, now = new Date().toISOString()): LearningSelection[] {
  if (!learningPaths.some(path => path.id === pathId) || current.some(item => item.pathId === pathId)) return current;
  return [...current, { pathId, addedAt: now, startedAt: now, stoppedAt: null, active: true }];
}

export function toggleLearningPath(current: LearningSelection[], pathId: string, now = new Date().toISOString()): LearningSelection[] {
  return current.map(item => item.pathId !== pathId ? item : item.active
    ? { ...item, active: false, stoppedAt: now }
    : { ...item, active: true, startedAt: now });
}
