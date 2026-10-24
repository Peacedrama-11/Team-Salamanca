export const workOptions = [
  { id: 'software-it', label: 'Software & IT' },
  { id: 'data-analytics', label: 'Data & Analytics' },
  { id: 'business-admin', label: 'Business & Administration' },
  { id: 'creative-design', label: 'Creative & Design' },
  { id: 'customer-service', label: 'Customer Service' },
  { id: 'other', label: 'Other' },
] as const;

export const taskOptions = [
  { id: 'admin', label: 'Repetitive administrative tasks' },
  { id: 'content', label: 'Writing or creating content' },
  { id: 'analysis', label: 'Analyzing information' },
  { id: 'problem-solving', label: 'Solving complex problems' },
  { id: 'communication', label: 'Communicating with people' },
] as const;

export type WorkType = typeof workOptions[number]['id'];
export type TaskType = typeof taskOptions[number]['id'];
export type CrashAnswers = { workType: WorkType; taskType: TaskType };
type ScenarioId = 'gradual' | 'redesign';
export type ScenarioResult = {
  id: ScenarioId;
  title: string;
  description: string;
  changes: string[];
  skills: string[];
  actions: string[];
};

export const CRASH_DISCLAIMER = 'These are illustrative what-if scenarios, not personalized forecasts or predictions based on actual labor-market data.';

type WorkRule = { change: string; skill: string; action: string };
type TaskRule = { changes: [string, string]; skills: [string, string]; action: string };

// Both answers contribute to both scenarios. Content describes possibilities,
// not likelihoods, risk scores, assessments or predictions.
const workRules: Record<WorkType, Record<ScenarioId, WorkRule>> = {
  'software-it': {
    gradual: {
      change: 'AI could draft small code changes or technical documentation while developers retain responsibility for review.',
      skill: 'Code review',
      action: 'Choose one low-risk development task and compare an AI-assisted draft against your existing review checklist.',
    },
    redesign: {
      change: 'Development teams might reorganize around specifying systems, integrating generated code and reviewing releases.',
      skill: 'System design',
      action: 'Map a development workflow with your team and agree where human approval must remain before release.',
    },
  },
  'data-analytics': {
    gradual: {
      change: 'AI could assist with query drafts or report summaries while analysts verify the source data and interpretation.',
      skill: 'Data validation',
      action: 'Try one non-sensitive analysis example and check every generated claim against its original data.',
    },
    redesign: {
      change: 'Analytics workflows might shift toward shared AI-assisted reporting, with people defining measures and governing access.',
      skill: 'Data governance',
      action: 'Document who owns a recurring report, its source definitions and the checks needed before distribution.',
    },
  },
  'business-admin': {
    gradual: {
      change: 'AI could draft routine documents or organize records without removing existing administrative responsibilities.',
      skill: 'Process documentation',
      action: 'Document one routine administrative task, including the exceptions that still need a person to decide.',
    },
    redesign: {
      change: 'Administrative work could be coordinated across connected tools, changing handoffs and approval responsibilities.',
      skill: 'Workflow coordination',
      action: 'Review one end-to-end office process with its owners and identify approval and exception-handling responsibilities.',
    },
  },
  'creative-design': {
    gradual: {
      change: 'AI could generate early concepts or draft assets while people retain responsibility for the creative brief and final choice.',
      skill: 'Creative direction',
      action: 'Test draft ideas using a non-confidential brief, then review them against audience, accessibility and brand requirements.',
    },
    redesign: {
      change: 'Creative teams might work with more generated variations and spend more time defining briefs and curating coherent outcomes.',
      skill: 'Design evaluation',
      action: 'Agree a creative review checklist covering originality, rights, accessibility and consistency before testing a new workflow.',
    },
  },
  'customer-service': {
    gradual: {
      change: 'AI could suggest replies or summarize previous conversations while service staff check context and handle the response.',
      skill: 'Customer context',
      action: 'Review sample suggested replies with an experienced colleague for accuracy, tone and sensitive situations.',
    },
    redesign: {
      change: 'Service workflows might route routine requests through AI-assisted channels while people handle complex cases and escalations.',
      skill: 'Escalation management',
      action: 'Map a service journey and specify when a customer should be able to reach a person.',
    },
  },
  other: {
    gradual: {
      change: 'AI could assist with selected tasks in your field while existing responsibilities remain broadly similar.',
      skill: 'Task mapping',
      action: 'List a typical week of work and choose one low-risk task to discuss with someone familiar with your field.',
    },
    redesign: {
      change: 'Connected AI tools could change how tasks are divided and reviewed; the implications would depend on your field.',
      skill: 'Workflow assessment',
      action: 'Map one workflow with a colleague and identify domain-specific safety or approval requirements before experimenting.',
    },
  },
};

const taskRules: Record<TaskType, Record<ScenarioId, TaskRule>> = {
  admin: {
    gradual: {
      changes: [
        'Routine record updates, scheduling or first drafts could become more tool-assisted.',
        'Your attention might shift toward checking entries and resolving unusual cases.',
      ],
      skills: ['Tool-output verification', 'Exception handling'],
      action: 'Make a checklist for one repetitive task, including how to catch incorrect or incomplete outputs.',
    },
    redesign: {
      changes: [
        'Several repetitive steps could be linked together instead of assisted one at a time.',
        'People might supervise exceptions and decide when a workflow should pause for review.',
      ],
      skills: ['Workflow mapping', 'Quality assurance'],
      action: 'Sketch a connected version of a repetitive process and mark the checkpoints that need human review.',
    },
  },
  content: {
    gradual: {
      changes: [
        'AI could help produce outlines, first drafts or alternative wording.',
        'Fact-checking, audience judgement and ownership of the final content would still need attention.',
      ],
      skills: ['Editorial judgement', 'Fact-checking'],
      action: 'Compare an assisted draft with a manual draft using the same accuracy and audience checklist.',
    },
    redesign: {
      changes: [
        'Content workflows could produce and adapt more variations across different channels.',
        'Responsibilities might shift toward setting standards, selecting outputs and checking provenance.',
      ],
      skills: ['Content strategy', 'Source and rights verification'],
      action: 'Define review and sign-off rules for a small content workflow before trying to scale it.',
    },
  },
  analysis: {
    gradual: {
      changes: [
        'AI could help summarize documents or suggest patterns to investigate.',
        'Checking sources, assumptions and missing context would remain important parts of the work.',
      ],
      skills: ['Critical thinking', 'Source verification'],
      action: 'Take one generated summary and trace its key claims back to the original evidence.',
    },
    redesign: {
      changes: [
        'Information gathering and summarization could become connected parts of a recurring workflow.',
        'People might focus more on framing questions, challenging assumptions and explaining decisions.',
      ],
      skills: ['Decision framing', 'Evidence evaluation'],
      action: 'Write the assumptions, evidence requirements and escalation rules for one recurring decision.',
    },
  },
  'problem-solving': {
    gradual: {
      changes: [
        'AI could suggest approaches or help explore alternatives for a defined problem.',
        'People would still need to test feasibility and weigh trade-offs in context.',
      ],
      skills: ['Problem framing', 'Solution evaluation'],
      action: 'Define the constraints for a real problem, then compare suggested solutions against those constraints.',
    },
    redesign: {
      changes: [
        'Teams might explore more possible solutions through connected research, prototyping and testing tools.',
        'Work could shift toward defining constraints, validating outcomes and coordinating expert review.',
      ],
      skills: ['Systems thinking', 'Experiment design'],
      action: 'Design a small reversible experiment with success criteria and a named person responsible for review.',
    },
  },
  communication: {
    gradual: {
      changes: [
        'AI could assist with meeting notes, message drafts or conversation preparation.',
        'Trust, empathy and checking that a message fits the situation would remain human responsibilities.',
      ],
      skills: ['Active listening', 'Communication judgement'],
      action: 'Review an assisted message for accuracy, tone and confidentiality before sharing it.',
    },
    redesign: {
      changes: [
        'Routine updates and information handoffs could become more automated across a team.',
        'People might spend more time resolving ambiguity, building trust and handling difficult conversations.',
      ],
      skills: ['Facilitation', 'Conflict resolution'],
      action: 'Agree which communications can be assisted and which sensitive conversations should stay person-to-person.',
    },
  },
};

export function getCrashScenarios(answers: CrashAnswers): [ScenarioResult, ScenarioResult] {
  if (!Object.hasOwn(workRules, answers.workType) || !Object.hasOwn(taskRules, answers.taskType)) {
    throw new Error('Choose a valid work type and main task before comparing scenarios.');
  }
  const makeScenario = (id: ScenarioId): ScenarioResult => {
    const work = workRules[answers.workType][id], task = taskRules[answers.taskType][id];
    return {
      id,
      title: id === 'gradual' ? 'Gradual AI Adoption' : 'Faster Workflow Redesign',
      description: id === 'gradual'
        ? 'AI gradually assists with individual tasks. Existing job responsibilities mostly remain similar.'
        : 'AI is adopted more rapidly. Entire workflows and job responsibilities may change.',
      changes: [work.change, ...task.changes],
      skills: [...new Set([work.skill, ...task.skills])],
      actions: [work.action, task.action],
    };
  };
  return [makeScenario('gradual'), makeScenario('redesign')];
}
