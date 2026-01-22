require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const crypto = require('crypto');
const { GoogleGenerativeAI } = require('@google/generative-ai');

let pdfParse;
try { pdfParse = require('pdf-parse'); } catch {}

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const USE_LOCAL_AI = process.env.USE_LOCAL_AI === 'true';

// 🔴 STEP 5: Gemini kept ONLY as emergency fallback (not primary path)
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ ERROR: GEMINI_API_KEY not found in .env file');
  console.error('Please add GEMINI_API_KEY to your .env file and restart the server');
  process.exit(1);
}

console.log('🚀 Initializing MockMate Server...');
console.log('📝 Loading dependencies...');
console.log(`🤖 AI Mode: ${USE_LOCAL_AI ? 'Local AI Service (phi3)' : 'Gemini Cloud (fallback only)'}`);

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

console.log('✅ Dependencies loaded successfully');

const MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash'
];

const tryGenerate = async (prompt, timeout = 60000) => {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Timeout after " + timeout + "ms")), timeout)
  );
  
  for (const model of MODELS) {
    try {
      console.log(`  🤖 Trying model: ${model}`);
      const m = genAI.getGenerativeModel({ model });
      const r = await Promise.race([
        m.generateContent(prompt),
        timeoutPromise
      ]);
      const text = r.response.text();
      if (text && text.length > 10) {
        console.log(`  ✅ Model ${model} succeeded (${text.length} chars)`);
        return text;
      }
      console.warn(`  ⚠️ Model ${model} returned short response`);
    } catch (e) {
      console.error(`  ❌ Model ${model} failed: ${e.message}`);
      if (e.message.includes('API_KEY')) {
        throw new Error('Invalid or expired API key');
      }
    }
  }
  throw new Error("All models failed to generate content");
};

const cleanJson = (t="") => {
  if (!t) {
    console.warn('cleanJson: Empty response from AI');
    return '{"direction":"","answer":""}';
  }
  // Remove markdown code blocks/fences and trim
  let cleaned = t.replace(/```json\n?|```/g, '').trim();

  // Prefer single JSON object
  const objStart = cleaned.indexOf('{');
  const objEnd = cleaned.lastIndexOf('}');
  if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
    const candidate = cleaned.slice(objStart, objEnd + 1);
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      // fall through to array handling
    }
  }

  // Fallback: try to extract JSON array and use first element
  const arrStart = cleaned.indexOf('[');
  const arrEnd = cleaned.lastIndexOf(']');
  if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
    const arrayStr = cleaned.slice(arrStart, arrEnd + 1);
    try {
      const arr = JSON.parse(arrayStr);
      if (Array.isArray(arr) && arr.length > 0) {
        return JSON.stringify(arr[0]);
      }
    } catch {}
  }

  console.warn('cleanJson: No valid JSON object/array found in response');
  console.warn('Response preview:', t.slice(0, 200));
  return '{"direction":"","answer":""}';
};

/* ---------- DOMAIN SIGNALS ---------- */

const DOMAIN_SIGNALS = {
  tech: ['javascript','react','node','api','database','server','frontend','backend','code','python','java','cloud','aws','docker','kubernetes','devops','ml','ai','data','analytics','typescript','angular','vue','golang','rust','microservices','restful','graphql','mongodb','postgresql','redis','kafka','jenkins','ci/cd','terraform','ansible','git','github','gitlab','webpack','vite','express','django','flask','spring','dotnet','azure','gcp','lambda','serverless','nextjs','remix'],
  core: ['mechanical','electrical','civil','manufacturing','design','plant','cad','autocad','solidworks','thermodynamics','circuits','structures','hvac','robotics','aerospace','automotive','plc','scada','cnc','welding','machining','fluid mechanics','heat transfer','control systems','embedded','pcb','vhdl','verilog','matlab','simulink','ansys','catia','nx','inventor','revit','etabs','staad','hydraulics','pneumatics','gears','motors'],
  business: ['marketing','sales','operations','finance','strategy','consulting','management','analytics','crm','revenue','growth','product management','b2b','b2c','saas','roi','kpi','market research','competitive analysis','pricing','positioning','segmentation','branding','campaigns','lead generation','conversion','retention','seo','sem','social media','email marketing','content strategy','partnership','stakeholder','forecasting','budgeting','p&l'],
  creative: ['design','video','editing','content','writing','branding','ui','ux','figma','photoshop','illustrator','animation','graphics','adobe','premiere','after effects','blender','sketch','invision','prototyping','wireframing','typography','color theory','user research','a/b testing','usability','accessibility','motion design','3d modeling','rendering','storyboarding','copywriting','storytelling','visual identity'],
  data: ['data science','machine learning','statistics','tableau','powerbi','sql','analytics','modeling','visualization','python','pandas','numpy','scikit-learn','tensorflow','pytorch','keras','deep learning','neural networks','nlp','computer vision','big data','hadoop','spark','etl','data pipeline','feature engineering','regression','classification','clustering','time series','a/b testing','hypothesis testing','data cleaning','exploratory analysis'],
  finance: ['accounting','investment','portfolio','trading','valuation','financial modeling','audit','tax','equity','debt','derivatives','options','futures','hedge fund','private equity','venture capital','m&a','dcf','wacc','capm','balance sheet','income statement','cash flow','gaap','ifrs','quickbooks','sap','oracle','bloomberg','excel','vba','risk management','compliance'],
  research: ['research','publication','thesis','experiment','analysis','laboratory','academic','study','literature review','methodology','hypothesis','data collection','statistical analysis','peer review','citation','conference','journal','abstract','ethics','irb','survey','interview','qualitative','quantitative','meta-analysis','case study','field work','validation'],
  healthcare: ['patient care','clinical','diagnosis','treatment','medical','nursing','pharmacy','healthcare','hospital','ehr','hipaa','epidemiology','public health','surgery','radiology','cardiology','oncology','pediatrics','geriatrics','mental health','telemedicine','medical devices','clinical trials','pathology'],
  education: ['teaching','curriculum','pedagogy','classroom','students','learning','assessment','education','tutoring','training','elearning','instructional design','lesson planning','differentiation','rubric','standards','accreditation','lms','canvas','blackboard','zoom','educational technology'],
  general: []
};

const detectDomain = (text) => {
  const t = text.toLowerCase();
  for (const [domain, words] of Object.entries(DOMAIN_SIGNALS)) {
    if (words.some(w => t.includes(w))) return domain;
  }
  return 'general';
};

const extractResumeTopics = (text) => {
  const topics = [];
  const t = text.toLowerCase();
  
  // Extract technologies/tools mentioned (minimum 2 chars to avoid single letters)
  const allKeywords = Object.values(DOMAIN_SIGNALS).flat().filter(k => k.length >= 2);
  for (const keyword of allKeywords) {
    if (t.includes(keyword)) topics.push(keyword);
  }
  
  // Extract common resume patterns
  const patterns = [
    /(?:developed|built|created|designed|implemented|managed)\s+([\w\s]{4,30})(?=\.|,|\s+using|\s+with)/gi,
    /(?:experience with|knowledge of|proficient in|skilled in)\s+([\w\s,]{4,})/gi,
    /\b([A-Z][\w]+(?:\s+[A-Z][\w]+){0,3})\s+(?:project|internship|course|certification)/gi
  ];
  
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(m => {
      if (m[1] && m[1].trim().length >= 4 && m[1].trim().length < 50) {
        topics.push(m[1].trim());
      }
    });
  }
  
  // Filter out any single-character or too-short topics
  return [...new Set(topics)].filter(t => t.length >= 4).slice(0, 30);
};

const randomSample = (arr, n) => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
};

/* ---------- JD TOPICS + TEMPLATE HELPERS ---------- */

const extractJDTopics = (text = "") => {
  const topics = [];
  const t = text.toLowerCase();

  // domain keywords (minimum 2 chars to avoid single letters)
  const allKeywords = Object.values(DOMAIN_SIGNALS).flat().filter(k => k.length >= 2);
  for (const keyword of allKeywords) {
    if (t.includes(keyword)) topics.push(keyword);
  }

  // common JD patterns
  const patterns = [
    /experience (?:with|in) ([\w\-/\s]{4,40})/gi,
    /proficient (?:with|in) ([\w\-/\s]{4,40})/gi,
    /(knowledge|familiarity) (?:with|in) ([\w\-/\s]{4,40})/gi,
    /responsible for ([\w\-/\s]{5,60})/gi,
    /(?:build|design|architect|implement|own)\s+([\w\-/\s]{4,40})/gi
  ];

  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(m => {
      const grp = m[m.length - 1];
      // Filter out very short matches and single letters
      if (grp && grp.trim().length >= 4 && grp.trim().length < 60) {
        topics.push(grp.trim());
      }
    });
  }

  // Filter out any single-character or too-short topics
  return [...new Set(topics)].filter(t => t.length >= 4).slice(0, 20);
};

const JD_QUESTION_TEMPLATES = [
  (a, b) => `The job description emphasizes ${a}. Walk me through a concrete example where you delivered ${a} end-to-end, the trade-offs you made, and the business impact.`,
  (a, b) => `Our role calls for hands-on experience with ${a}${b ? ` and ${b}` : ''}. Describe a project where you combined ${a}${b ? ` and ${b}` : ''} to solve a real problem, including metrics or outcomes.`,
  (a, b) => `Given the requirement for ${a}, how would you design, implement, and validate a solution in our environment? Include risks, rollout, and monitoring.`,
  (a, b) => `The JD mentions ownership of ${a}. Tell me about a time you owned ${a} under constraints (time, legacy systems, or scale) and how you de-risked delivery.`,
  (a, b) => `We frequently work with ${a}. What was the most complex issue you solved using ${a}, and how did you measure success?`
];

const LONG_QUESTION_TEMPLATES = [
  (t1, t2) => `Think of a project where you were responsible for design, implementation, and rollout. How did you translate ambiguous requirements into a plan, align stakeholders, choose the architecture, manage trade-offs, and ensure a safe launch? In hindsight, what would you change?`,
  (t1, t2) => `Describe a high-stakes incident (e.g., production degradation or failed release) you helped resolve. How did you triage, communicate, coordinate with other teams, apply a fix, and prevent recurrence? Include technical details and outcomes.`,
  (t1, t2) => `Tell me about a time you inherited a problematic codebase or service. How did you assess risk, prioritize refactors, set quality bars (tests, observability), and deliver user value while paying down debt? What metrics improved?`,
  (t1, t2) => `Walk me through a system you scaled by 10x. What bottlenecks did you identify, how did you benchmark, what architectural changes did you make, how did you validate improvements, and what trade-offs did you accept?`
];

const generateJDQuestions = (jdText, count = 3) => {
  const topics = extractJDTopics(jdText);
  // Filter to ensure topics are at least 4 characters and not single letters
  const validTopics = topics.filter(t => t && t.length >= 4);
  const picks = validTopics.length ? randomSample(validTopics, Math.min(2, validTopics.length)) : [];
  const a = picks[0] || 'technical skills';
  const b = picks[1];
  const templates = randomSample(JD_QUESTION_TEMPLATES, Math.min(count, JD_QUESTION_TEMPLATES.length));
  return templates.map(t => t(a, b)).slice(0, count);
};

const generateLongQuestions = (contextTopics = [], count = 2) => {
  const t1 = contextTopics[0] || 'a key area you owned';
  const t2 = contextTopics[1] || 'a cross-functional dependency';
  const templates = randomSample(LONG_QUESTION_TEMPLATES, Math.min(count, LONG_QUESTION_TEMPLATES.length));
  return templates.map(t => t(t1, t2)).slice(0, count);
};

/* ---------- QUESTION INTENT DATASET (MASSIVE - 100x expanded) ---------- */

const INTRO_QUESTIONS = [
  "Tell me about yourself",
  "What brings you here today",
  "Give me your 30-second pitch",
  "Introduce yourself like you're meeting a client",
  "What should I know about you that's not on paper",
  "What makes you tick",
  "How did you end up where you are today",
  "What's your vision and ambition",
  "Tell me a bit about your background",
  "What defines you as a professional"
]

const TECH_QUESTIONS = [
  "What is a variable and how do you use it",
  "Explain the difference between a function and a method",
  "What are loops and why do we need them",
  "Explain what an array is and give an example",
  "What's the difference between synchronous and asynchronous code",
  "Explain the concept of variables, data types, and operators",
  "What is a loop and what are the different types",
  "Explain what an object is in programming",
  "What's the difference between let, const, and var",
  "Explain what a string is and how to manipulate it",
  "What are conditional statements and give examples",
  "Explain what a function parameter is",
  "What is the purpose of a return statement",
  "Explain the concept of scope in programming",
  "What's the difference between == and ===",
  "Explain what null and undefined mean",
  "What is a callback function",
  "Explain what Promises are in JavaScript",
  "What's the difference between a class and an object",
  "Explain what inheritance is in programming",
  "Explain a technical decision you made and why",
  "Describe a complex system you've built from scratch",
  "Tell me about the most challenging technical problem you've solved",
  "Walk me through your approach to debugging production issues",
  "How do you handle technical debt",
  "Explain a time you had to learn a new technology quickly",
  "What's your approach to system design",
  "Tell me about a time you optimized code - what was the result",
  "How do you balance quality and speed",
  "Describe your experience with scalable architectures",
  "Tell me about your testing strategy",
  "How do you approach code reviews",
  "What's your experience with CI/CD pipelines",
  "Describe a time you refactored legacy code",
  "How do you stay updated with new technologies",
  "What's your experience with cloud platforms",
  "Tell me about a time you fixed a critical bug",
  "How do you approach API design",
  "What's your experience with databases - relational vs NoSQL",
  "Describe a time you had to make a technical tradeoff",
  "How do you handle technical disagreements with teammates",
  "Tell me about your experience with microservices",
  "What's your approach to error handling",
  "Describe a system you architected that handles high traffic",
  "How do you ensure code is maintainable"
];

const BEHAVIORAL_QUESTIONS = [
  "Tell me about a time you failed",
  "Describe a conflict with a teammate and how you solved it",
  "Tell me about a time you went beyond expectations",
  "Tell me about a time you had to adjust quickly",
  "Tell me about a time you took the lead",
  "Tell me about a time you met a tight deadline",
  "Describe a time you got important feedback",
  "Tell me about a time you did something difficult",
  "Describe a situation where you had to choose",
  "Tell me about a time you helped a colleague",
  "Describe a time you handled something on your own",
  "Tell me about a time you was under tension",
  "Tell me about a time you did something new",
  "Describe a success you had at work"
]

const SCENARIO_QUESTIONS = [
  "If you had a bug in production, how would you handle it",
  "You're given a vague requirement - what do you do",
  "Your manager asks you to do something you think is wrong - how do you respond",
  "You realize you made a mistake that affects the team - what's your next step",
  "You're working on a project and the timeline keeps shrinking - how do you manage",
  "A senior engineer disagrees with your approach - how do you handle it",
  "You notice a potential security issue - what do you do",
  "You're assigned to a tech stack you've never used - how do you proceed",
  "Your code review gets multiple change requests - how do you respond",
  "You discover a better way to do something mid-project - how do you handle it",
  "You're blocked by another team - what's your approach",
  "You realize your initial estimate was way off - what do you do",
  "A critical dependency fails - how do you respond",
  "You have two conflicting priorities - how do you decide",
  "Someone takes credit for your work - how do you handle it",
  "You're asked to do something outside your expertise - what's your approach",
  "You find a major flaw in the architecture - how do you communicate it",
  "You're in a meeting and realize you don't understand something - what do you do",
  "Your solution doesn't perform as expected - what's your next step",
  "You have to choose between tech debt and new features - how do you decide"
];

const GROWTH_QUESTIONS = [
  "What do you aim for in the next 5 years",
  "How do you go about learning new things",
  "What's a field you want to get into",
  "Tell me about something you're studying now",
  "What's a skill you've picked up lately",
  "How do you make sure you know the latest things",
  "What's a new tech you want to get into",
  "How do you help yourself get better",
  "What books have changed how you think",
  "Tell me about a course you've taken",
  "What's a skill you had to teach to yourself",
  "What's the biggest lesson you've picked up at work",
  "What's something you've mastered on your own",
  "Tell me about a skill gap you've closed"
];

const CULTURE_QUESTIONS = [
  "What kind of team environment do you thrive in",
  "How do you approach collaboration",
  "Tell me about your communication style",
  "How do you handle feedback",
  "What's your approach to remote work",
  "How do you build relationships with colleagues",
  "What does company culture mean to you",
  "How do you contribute to team morale",
  "Describe your ideal work setup",
  "How do you handle working with diverse perspectives",
  "What's your approach to mentoring others",
  "How do you balance autonomy and collaboration",
  "Tell me about a time you improved team dynamics",
  "How do you approach giving feedback",
  "What's your communication preference",
  "How do you handle disagreement professionally",
  "Describe your approach to documentation",
  "How do you contribute to knowledge sharing",
  "What's your stance on pair programming",
  "How do you approach onboarding new team members"
];

const MOTIVATION_QUESTIONS = [
  "What motivates you at work",
  "Tell me about a project that excited you",
  "What's your ideal project",
  "What energizes you professionally",
  "What would make you leave a job",
  "What are you looking for in this role",
  "Why does this position appeal to you",
  "What attracted you to this company",
  "Tell me about your dream job",
  "What's important to you in a workplace",
  "How do you measure success",
  "What legacy do you want to leave",
  "Tell me about work that makes you feel fulfilled",
  "What's your relationship with your work",
  "How do you find meaning in what you do",
  "What would you do if money wasn't a concern",
  "Describe a day when you felt most satisfied at work",
  "What kind of impact do you want to make",
  "How important is career growth to you",
  "Tell me about a role that felt like a perfect fit"
];

const EXPERIENCE_QUESTIONS = [
  "Tell me in detail about your most complex project",
  "Walk me through a project from start to finish",
  "Describe your biggest accomplishment",
  "Tell me about a project where you made a significant impact",
  "Describe your experience with [specific technology]",
  "Tell me about a time you led a team",
  "Describe your experience in [specific domain]",
  "Tell me about a high-stakes project you worked on",
  "Describe a project with an unusual constraint",
  "Tell me about a project where you worked cross-functionally",
  "Describe your experience mentoring junior developers",
  "Tell me about a time you owned a feature end-to-end",
  "Describe a project where you had to make hard architectural decisions",
  "Tell me about a time you worked on a greenfield project",
  "Describe your experience with legacy codebases",
  "Tell me about the largest team you've worked with",
  "Describe a project that taught you the most",
  "Tell me about a time you worked on open source",
  "Describe a project that changed how you think about engineering",
  "Tell me about your experience with distributed systems"
];

const PROBLEM_SOLVING_QUESTIONS = [
  "Describe a problem you solved that nobody thought was solvable",
  "Tell me about a time you had to think outside the box",
  "Describe a problem that had no obvious solution",
  "Tell me about your problem-solving approach",
  "Describe a time you found an elegant solution",
  "Tell me about a complex problem you broke down",
  "Describe a time you had to be creative in your solution",
  "Tell me about a problem that required deep thinking",
  "Describe a time you solved something with minimal resources",
  "Tell me about an unconventional approach you took",
  "Describe a problem that required persistence",
  "Tell me about a time you had to validate an assumption",
  "Describe a problem you solved by asking better questions",
  "Tell me about a time you had to simplify something complex",
  "Describe a problem that had multiple valid solutions",
  "Tell me about a time you had to prototype a solution",
  "Describe a problem that required collaboration to solve",
  "Tell me about a time you optimized something unexpected",
  "Describe a problem you solved by looking at it differently",
  "Tell me about a complex problem you documented well"
];

const CHALLENGE_QUESTIONS = [
  "What's the toughest challenge you've faced",
  "Tell me about a time something didn't go according to plan",
  "Describe your biggest professional setback",
  "Tell me about a time you felt out of your depth",
  "Describe a situation where you had to improvise",
  "Tell me about a time something went wrong and you fixed it",
  "Describe the most difficult person you've worked with",
  "Tell me about a project that was a struggle",
  "Describe a time you had to overcome a limitation",
  "Tell me about a situation that tested your patience",
  "Describe a time you had to do something you'd never done before",
  "Tell me about a time you had to stand firm on something",
  "Describe a project with unexpected complications",
  "Tell me about a time you failed publicly",
  "Describe a situation where you had to admit you were wrong",
  "Tell me about the most stressful period of your career",
  "Describe a time you had to work with poor requirements",
  "Tell me about a time you had to deliver something you weren't satisfied with",
  "Describe a situation where you had to choose between two bad options",
  "Tell me about a time you had to overcome imposter syndrome"
];

const ROLE_FIT_QUESTIONS = [
  "Why are you interested in this role specifically",
  "How do your skills align with this position",
  "What attracted you to this job posting",
  "Why do you think you'd be good at this role",
  "What aspects of this role excite you most",
  "How does this role fit into your career path",
  "What do you know about this team",
  "Why are you leaving your current role",
  "What are you looking for in your next opportunity",
  "How have you prepared for this interview",
  "What do you bring to this team",
  "Why this company",
  "What's your understanding of what we do",
  "How would you add value to this organization",
  "What challenges do you think this role will face",
  "How would you approach the first 90 days",
  "What would success look like for you in this role",
  "How do your past experiences prepare you for this position",
  "What questions do you have about this role",
  "How would you measure your success in this position"
];

const MISC_QUESTIONS = [
  "Tell me something interesting about yourself",
  "What's the best advice you've ever received",
  "What's the worst professional advice you've gotten",
  "Tell me about a skill that surprised you to have",
  "What's something people often misunderstand about you",
  "Describe a trend in your field you disagree with",
  "What's your unpopular opinion in your field",
  "Tell me about something that inspired you recently",
  "What's one thing you want to improve about yourself",
  "Describe a moment you felt proud",
  "Tell me about a person who influenced your career",
  "What's your favorite failure",
  "Describe a time you surprised yourself",
  "What's the most valuable lesson you've learned",
  "Tell me about a risk you took that paid off",
  "Describe your approach to work-life balance",
  "What energizes you outside of work",
  "Tell me about a side project you've done",
  "What would you be doing if not tech",
  "Describe your ideal day"
];

/* ---------- REAL-LIFE QUESTIONS FROM ACTUAL INTERVIEWS ---------- */

const REAL_WORLD_QUESTIONS = [
  "You're in a meeting and your manager says we're going to add this massive feature in 2 weeks. What's your first reaction and how would you approach it",
  "Tell me about a time when a production issue happened and you were blamed unfairly. How did you handle it",
  "You discover that your codebase uses a deprecated library. What do you do",
  "A junior dev on your team keeps making the same mistakes in code reviews. How do you handle it",
  "Your company's tech stack is 5 years old but it works fine. Should we modernize it - why or why not",
  "You're asked to estimate a project and you think it's impossible to do in the given timeline. How do you communicate this",
  "A client changes requirements after half the project is done. Walk me through how you'd handle it",
  "You inherit a codebase that's an absolute mess. How do you begin to improve it without breaking anything",
  "Your database suddenly gets slow. You don't know if it's a query issue or infrastructure. How do you debug",
  "Two team members have a conflict about approach - one wants to do X, one wants to do Y. You're responsible. What do you do",
  "You realize you misunderstood a requirement after spending 3 days on implementation. Do you start over or adapt",
  "Your company wants to switch from monolith to microservices. What questions do you ask before proceeding",
  "You notice the code you wrote 6 months ago is being used differently than intended. Do you fix it or leave it",
  "A feature you built doesn't perform well in production. The fix requires a full refactor. What do you propose",
  "You're assigned to a project using a framework you hate. How do you approach it",
  "Your team is burning out from technical debt. How do you make the case for paying it down",
  "You see someone about to deploy code you know has a bug. Do you stop them or let them learn",
  "A vendor tool you relied on disappears. Your deadline is unchanged. What do you do",
  "You're asked to add a feature that goes against best practices. How do you respond",
  "Your code review gets 50 comments. Do you feel defensive or grateful"
];

const INTERVIEW_TECHNIQUE_QUESTIONS = [
  "When you have a bug, describe your exact debugging process step by step",
  "Tell me about a time you had to say 'I don't know' during work. How did you handle it",
  "Walk me through how you would approach a system you've never worked with",
  "Tell me about something you read recently that made you think differently about your work",
  "You're stuck on a problem for hours. What's your next step",
  "How would you explain a complex technical concept to a non-technical person",
  "Tell me about a time your approach was completely wrong - what happened",
  "Describe your process for learning a new technology from scratch",
  "How do you decide whether to build, buy, or use open source",
  "Tell me about a time you had to rollback changes. What went wrong",
  "How do you balance learning new things with shipping what's needed",
  "What's your process when you disagree with a technical decision",
  "Tell me about your testing strategy for a critical feature",
  "How do you ensure the code you ship is maintainable",
  "Describe your approach to documentation - do you do it",
  "Tell me about a time you optimized something - what was the impact",
  "What's your philosophy on refactoring - when do you do it",
  "How do you stay organized across multiple projects or tasks",
  "Tell me about your experience with different programming paradigms",
  "How do you handle working on boring or repetitive tasks"
];

const RESUME_DEEP_DIVE_QUESTIONS = [
  "I see you listed [specific project]. Can you walk me through what you actually built",
  "What was your role in [team project] - what parts did you personally own",
  "You mentioned [specific technology]. How deep is your experience with it",
  "On your resume it says you worked on [feature]. What was the technical challenge there",
  "I see a gap in your timeline here. What were you doing during this period",
  "You list both [tech A] and [tech B]. How do you decide which to use when",
  "Tell me about your biggest contribution to [company name]",
  "What was the impact of [project you mentioned] - did it actually matter",
  "I notice you switched from [role A] to [role B]. Why that transition",
  "What would you do differently if you redid [project on resume]",
  "Tell me about the largest project you've personally shipped",
  "What's the most complex system architecture you've designed",
  "On your resume you mention [skill]. Show me an example where you used it",
  "What was the toughest technical challenge you faced at [previous company]",
  "Tell me about your biggest failure and what you learned",
  "What's an achievement on your resume that you're genuinely proud of",
  "I see you have [certification/degree]. How did it help your career",
  "Describe your most complex troubleshooting situation from your experience",
  "What's something on your resume that you've forgotten about or don't use anymore",
  "Tell me about a project that didn't work out the way you planned"
];

const UNEXPECTED_SCENARIOS = [
  "It's Friday 4pm, deployment happens tomorrow morning, and someone finds a critical issue. What's your move",
  "You get a feature request that will take 2 months but they want it in 2 days. How do you respond",
  "Your database crashes mid-transaction. Walk me through the recovery",
  "A competitor's product launches and it's way better than yours. What do you think our response should be",
  "You realize the architecture you just finished designing won't scale to next year's projected growth. Now what",
  "Your team disagrees with your technical decision publicly. How do you handle it",
  "Someone finds a security vulnerability in production code you wrote. Your reaction",
  "A well-liked team member is being fired. You still have to work together for 2 weeks. How do you handle it",
  "You're asked to work nights and weekends for a deadline. What do you say",
  "The company pivots completely and your product becomes irrelevant. What now",
  "Your manager asks you to do something that violates company policy. What do you do",
  "You discover expensive infrastructure spending that nobody is using. Do you fix it or tell management",
  "A customer reports something works differently than documented. Is it a bug or is documentation wrong",
  "You break something in production and it affects thousands of users. Walk me through your response",
  "Your new feature is slower than expected. The fix is hacky. Do you use it or redesign"
];

const CULTURE_FIT_QUESTIONS = [
  "Tell me about a time you had to work with someone you didn't really like",
  "How do you handle feedback that you think is unfair",
  "Describe your ideal team. What matters most - skill, culture, or something else",
  "Tell me about the best team you've worked on. What made it work",
  "How do you handle remote work vs in-person collaboration",
  "What's your approach to mentoring junior developers",
  "Tell me about a time you helped someone on a different team",
  "How do you celebrate wins with your team",
  "What's your take on open office vs quiet spaces for concentration",
  "Tell me about your experience with pair programming",
  "How do you contribute to team morale and culture",
  "What's the best feedback you've ever received and from whom",
  "How do you handle a manager who micromanages",
  "Tell me about your experience with code reviews",
  "What's your approach to helping with questions from teammates",
  "How important is equity or ownership to you at a company",
  "Tell me about a time the team disagreed about approach",
  "What's your experience with on-call rotations",
  "How do you know when it's time to leave a company",
  "What kind of company size do you prefer and why"
];

/* ---------- HELPER: Get Randomized Questions ---------- */

const ALL_QUESTION_POOLS = [
  INTRO_QUESTIONS,
  TECH_QUESTIONS,
  BEHAVIORAL_QUESTIONS,
  SCENARIO_QUESTIONS,
  GROWTH_QUESTIONS,
  CULTURE_QUESTIONS,
  MOTIVATION_QUESTIONS,
  EXPERIENCE_QUESTIONS,
  PROBLEM_SOLVING_QUESTIONS,
  CHALLENGE_QUESTIONS,
  ROLE_FIT_QUESTIONS,
  MISC_QUESTIONS,
  REAL_WORLD_QUESTIONS,
  INTERVIEW_TECHNIQUE_QUESTIONS,
  RESUME_DEEP_DIVE_QUESTIONS,
  UNEXPECTED_SCENARIOS,
  CULTURE_FIT_QUESTIONS
];

const getAllQuestions = () => ALL_QUESTION_POOLS.flat();

const getRandomizedQuestions = (count = 10) => {
  const allQuestions = getAllQuestions();
  const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
};



/* ---------- HEALTH CHECK ---------- */

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'MockMate API is running',
    endpoints: ['/api/parse-resume', '/api/generate-qa', '/api/evaluate-answer']
  });
});

/* ---------- PARSE RESUME ---------- */

app.post('/api/parse-resume', upload.single('resume'), async (req,res)=>{
  let text="";
  if (pdfParse) {
    try { text = (await pdfParse(req.file.buffer)).text; } catch {}
  }
  res.json({ text: text.slice(0,6000) || "Resume unavailable" });
});

/* ---------- GENERATE QUESTIONS ---------- */

app.post('/api/generate-qa', async (req,res)=>{
  try {
    console.log('\n📨 Received /api/generate-qa request');
    const { resumeText="", jobDescription="", questionCount=0 } = req.body;
    
    if (!resumeText && !jobDescription) {
      console.warn('⚠️ Both resume and JD are empty');
      return res.status(400).json({
        qaPairs: [],
        sessionId: crypto.randomUUID(),
        totalQuestions: 0,
        error: "Please provide either a resume or job description."
      });
    }

    const sessionId = crypto.randomUUID();
    const resumeTopics = extractResumeTopics(resumeText);
    const randomTopics = randomSample(resumeTopics, 5).join(', ');

    console.log(`\ud83d\udd04 Building 10 questions with constraints: first 8 short (\u22653 JD-based), last 2 long...`);

    // 1. Get 5 SHORT questions
    const shortQuestions = getRandomizedQuestions(5);
    // 2. Get 1 JD-SPECIFIC question  
    const jdQuestions = generateJDQuestions(jobDescription, 1);
    // 3. Get 3 LONG/REAL-LIFE questions
    const contextTopics = [...resumeTopics, ...extractJDTopics(jobDescription)];
    const longQuestions = generateLongQuestions(contextTopics, 3);
    // 4. Build question array
    let orderedQuestions = [
      ...shortQuestions.slice(0, 5),
      ...jdQuestions.slice(0, 1),
      ...longQuestions.slice(0, 3)
    ];
    // 5. Add self-intro if every 30 questions
    const shouldAddSelfIntro = questionCount > 0 && questionCount % 30 === 0;
    if (shouldAddSelfIntro) {
      orderedQuestions.unshift("Tell me about yourself and your professional journey.");
      console.log('✅ Self-intro added (30-question milestone)');
    }

    const randomQuestions = orderedQuestions;
    
    console.log(`\ud83d\udce3 Generating answers for ${randomQuestions.length} questions...`);
    const allQaPairs = [];

    // For each random question, generate direction and answer
    for (let i = 0; i < randomQuestions.length; i++) {
      try {
        const question = randomQuestions[i];
        
        const prompt = `
You are an expert interview coach. For this interview question, provide:
1. A clear, concise direction (what the interviewer is looking for)
2. A professional sample answer (4–6 sentences) tailored to the resume and job description, first-person, confident, concrete, and specific. Prefer the STAR pattern where relevant. Avoid generic guidance or meta commentary; write an actual answer a seasoned candidate would say.

CONTEXT:
Resume Topics: ${randomTopics}
Resume: ${resumeText.slice(0, 800)}
Job Description: ${jobDescription.slice(0, 400)}

QUESTION: "${question}"

Respond ONLY with a SINGLE JSON object (no markdown, no extra text):
{"direction":"What the interviewer is looking for","answer":"A professional, concrete sample answer (4–6 sentences)"}
`;

        const raw = await tryGenerate(prompt, 30000);
        const json = cleanJson(raw);
        const parsed = JSON.parse(json);
        
        allQaPairs.push({
          question: question,
          direction: parsed.direction || "Show genuine experience and thoughtful approach",
          answer: parsed.answer || "Provide a concrete example from your background that demonstrates your capability."
        });
        
        console.log(`  ✅ Question ${i + 1}/10 complete`);
      } catch (err) {
        console.warn(`  ⚠️ Failed to generate answer for question ${i + 1}, using defaults`);
        allQaPairs.push({
          question: randomQuestions[i],
          direction: "Share a concrete example demonstrating your skills",
          answer: "I've faced similar situations where I [action]. This taught me [learning] which I apply today."
        });
      }
    }

    res.json({ 
      qaPairs: allQaPairs, 
      sessionId, 
      totalQuestions: allQaPairs.length,
      generatedAt: new Date().toISOString()
    });

  } catch (err) {
    console.error("❌ Generate QA error:", err.message);
    res.status(500).json({
      qaPairs: [],
      sessionId: crypto.randomUUID(),
      totalQuestions: 0,
      error: `Failed to generate questions: ${err.message}`
    });
  }
});

/* ---------- EVALUATE ---------- */

app.post('/api/evaluate-answer', async (req,res)=>{
  try {
    const { question, userAnswer } = req.body;

    if (!question || !userAnswer) {
      return res.status(400).json({ 
        error: "Missing question or answer",
        rating: "Yellow", 
        score: 0, 
        feedback: "Please provide both question and answer",
        improvement_tip: "Try again with a complete answer"
      });
    }

    console.log('  📊 Evaluating answer via AI service...');

    // Check if we should use local AI
    if (USE_LOCAL_AI) {
      try {
        // Try AI service first
        const aiResponse = await fetch(`${AI_SERVICE_URL}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          user_answer: userAnswer,
          ideal_points: [] // Can add from question metadata later
        }),
        signal: AbortSignal.timeout(60000)
      });

      if (!aiResponse.ok) {
        throw new Error(`AI service returned ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      console.log('  ✅ AI service evaluation succeeded');

      // Convert AI service format to frontend format
      const score = Math.round((aiData.score / 10) * 100); // Convert 0-10 to 0-100
      const rating = score >= 85 ? 'Green' : score >= 65 ? 'Yellow' : 'Red';

      // Create justification from strengths/improvements
      const strengthsText = aiData.strengths?.slice(0, 2).join('. ') || '';
      const improvementsText = aiData.improvements?.slice(0, 1).join('. ') || '';
      const justification = `${strengthsText}${strengthsText && improvementsText ? '. However, ' : ''}${improvementsText}`;

      // Map to old breakdown format (distribute score)
      const baseScore = Math.floor(score / 5);
      const breakdown = {
        relevance: baseScore,
        clarity: baseScore,
        structure: baseScore,
        technical_depth: baseScore,
        impact: baseScore
      };

      return res.json({
        rating,
        score,
        justification: justification || 'Evaluation completed.',
        breakdown,
        improvement_tip: aiData.improvements?.[0] || 'Keep practicing',
        // Include AI service data for frontend Phase 2
        aiData: {
          strengths: aiData.strengths,
          improvements: aiData.improvements,
          rawScore: aiData.score,
          feedback: aiData.feedback
        }
      });

    } catch (aiError) {
      // Fallback to Gemini
      console.warn('  ⚠️ AI service failed, falling back to Gemini:', aiError.message);
    }
  }

    // Use Gemini (either as primary when USE_LOCAL_AI=false, or as fallback)
    if (!USE_LOCAL_AI || !res.headersSent) {
      console.log('  🤖 Using Gemini for evaluation...');

      const prompt = `
You are a candid, strict interviewer. Evaluate the candidate's answer with clear, honest feedback.

Question: ${question}
Answer: ${userAnswer}

Scoring criteria (each 0–20):
- relevance (answers the asked question directly)
- clarity (concise, easy to follow)
- structure (STAR or logical flow; no rambling)
- technical_depth (specifics, trade-offs, tools; no hand-waving)
- impact/examples (metrics, outcomes, ownership)

Total score = sum (0–100). Use stricter rating bands: Green (≥85), Yellow (65–84), Red (<65).
Be frank: do not inflate scores. Penalize generic answers and lack of examples.

Respond ONLY with a SINGLE JSON object (no markdown, no extra text):
{
  "rating":"Green|Yellow|Red",
  "score":0-100,
  "justification":"2–3 sentences explaining why this score, with specifics",
  "breakdown":{
    "relevance":0-20,
    "clarity":0-20,
    "structure":0-20,
    "technical_depth":0-20,
    "impact":0-20
  },
  "improvement_tip":"one concrete next step (e.g., add metrics, tighten structure)"
}
`;

      const raw = await tryGenerate(prompt, 30000);
      const json = cleanJson(raw);
      const result = JSON.parse(json);
      
      // Normalize result and compute defaults
      const breakdown = result.breakdown || {};
      const safeBreakdown = {
        relevance: Math.min(20, Math.max(0, breakdown.relevance ?? 10)),
        clarity: Math.min(20, Math.max(0, breakdown.clarity ?? 10)),
        structure: Math.min(20, Math.max(0, breakdown.structure ?? 10)),
        technical_depth: Math.min(20, Math.max(0, breakdown.technical_depth ?? 10)),
        impact: Math.min(20, Math.max(0, breakdown.impact ?? 10))
      };
      const computedScore = safeBreakdown.relevance + safeBreakdown.clarity + safeBreakdown.structure + safeBreakdown.technical_depth + safeBreakdown.impact;
      const score = typeof result.score === 'number' ? Math.max(0, Math.min(100, result.score)) : computedScore;
      const rating = result.rating || (score >= 85 ? 'Green' : score >= 65 ? 'Yellow' : 'Red');
      const justification = result.justification || 'Solid answer in parts, but could improve clarity and depth in examples.';
      const tip = result.improvement_tip || 'Use STAR structure and quantify impact with metrics.';

      console.log('  ✅ Gemini fallback succeeded');

      return res.json({
        rating,
        score,
        justification,
        breakdown: safeBreakdown,
        improvement_tip: tip
      });
    }
  } catch (err) {
    console.error("Evaluate error:", err);
    res.status(500).json({ 
      rating: "Yellow", 
      score: 50, 
      feedback: "Could not evaluate. Please try again.", 
      improvement_tip: "Review your answer and try again"
    });
  }
});

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('✅ MockMate Server Running Successfully!');
  console.log(`🌐 Server listening on http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   - POST /api/parse-resume`);
  console.log(`   - POST /api/generate-qa`);
  console.log(`   - POST /api/evaluate-answer`);
  console.log('='.repeat(50) + '\n');
});
