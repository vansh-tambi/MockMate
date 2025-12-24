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
if (!process.env.GEMINI_API_KEY) process.exit(1);

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash'
];

const tryGenerate = async (prompt) => {
  for (const model of MODELS) {
    try {
      const m = genAI.getGenerativeModel({ model });
      const r = await m.generateContent(prompt);
      if (r.response.text()) return r.response.text();
    } catch {}
  }
  throw new Error("LLM failure");
};

const cleanJson = (t="") =>
  t.replace(/```json|```/g,'').slice(t.indexOf('['), t.lastIndexOf(']')+1);

/* ---------- DOMAIN SIGNALS ---------- */

const DOMAIN_SIGNALS = {
  tech: ['javascript','react','node','api','database','server','frontend','backend','code','python','java','cloud','aws','docker','kubernetes','devops','ml','ai','data','analytics','typescript','angular','vue','golang','rust','microservices','restful','graphql','mongodb','postgresql','redis','kafka','jenkins','ci/cd','terraform','ansible','git','github','gitlab','webpack','vite','express','django','flask','spring','dotnet','azure','gcp','lambda','serverless','nextjs','remix'],
  core: ['mechanical','electrical','civil','manufacturing','design','plant','cad','autocad','solidworks','thermodynamics','circuits','structures','hvac','robotics','aerospace','automotive','plc','scada','cnc','welding','machining','fluid mechanics','heat transfer','control systems','embedded','pcb','vhdl','verilog','matlab','simulink','ansys','catia','nx','inventor','revit','etabs','staad','hydraulics','pneumatics','gears','motors'],
  business: ['marketing','sales','operations','finance','strategy','consulting','management','analytics','crm','revenue','growth','product management','b2b','b2c','saas','roi','kpi','market research','competitive analysis','pricing','positioning','segmentation','branding','campaigns','lead generation','conversion','retention','seo','sem','social media','email marketing','content strategy','partnership','stakeholder','forecasting','budgeting','p&l'],
  creative: ['design','video','editing','content','writing','branding','ui','ux','figma','photoshop','illustrator','animation','graphics','adobe','premiere','after effects','blender','sketch','invision','prototyping','wireframing','typography','color theory','user research','a/b testing','usability','accessibility','motion design','3d modeling','rendering','storyboarding','copywriting','storytelling','visual identity'],
  data: ['data science','machine learning','statistics','tableau','powerbi','sql','analytics','modeling','visualization','python','r','pandas','numpy','scikit-learn','tensorflow','pytorch','keras','deep learning','neural networks','nlp','computer vision','big data','hadoop','spark','etl','data pipeline','feature engineering','regression','classification','clustering','time series','a/b testing','hypothesis testing','data cleaning','exploratory analysis'],
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
  
  // Extract technologies/tools mentioned
  const allKeywords = Object.values(DOMAIN_SIGNALS).flat();
  for (const keyword of allKeywords) {
    if (t.includes(keyword)) topics.push(keyword);
  }
  
  // Extract common resume patterns
  const patterns = [
    /(?:developed|built|created|designed|implemented|managed)\s+([\w\s]{3,30})(?=\.|,|\s+using|\s+with)/gi,
    /(?:experience with|knowledge of|proficient in|skilled in)\s+([\w\s,]+)/gi,
    /\b([A-Z][\w]+(?:\s+[A-Z][\w]+){0,3})\s+(?:project|internship|course|certification)/gi
  ];
  
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(m => {
      if (m[1] && m[1].length > 3 && m[1].length < 50) {
        topics.push(m[1].trim());
      }
    });
  }
  
  return [...new Set(topics)].slice(0, 30); // Return unique topics
};

const randomSample = (arr, n) => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
};

/* ---------- QUESTION INTENT DATASET (MASSIVE) ---------- */

const INTRO_QUESTIONS = [
  "Tell me about yourself",
  "Walk me through your resume",
  "What brings you here today",
  "How would your friends describe you",
  "Give me your 30-second pitch",
  "What's your story in three chapters",
  "Introduce yourself like you're meeting a client",
  "What should I know about you that's not on paper"
];

const EXTRACURRICULAR_QUESTIONS = [
  "What do you do outside of work or academics",
  "Tell me about your hobbies and interests",
  "What activities are you involved in outside the classroom",
  "What's something you're passionate about that isn't your major",
  "How do you spend your weekends",
  "What clubs or organizations are you part of",
  "What's a skill you've learned outside of formal education",
  "Tell me about a hobby that taught you something unexpected"
];

const TECH_INTENTS = [
  "explain a decision you disagreed with in a technical implementation",
  "describe a failure you caused and how you diagnosed it",
  "tradeoff between simplicity and scalability",
  "how you verify something works beyond happy paths",
  "how you think about performance without benchmarks",
  "how you debug when logs are useless",
  "how you decide what not to build",
  "explain a concept to a non-technical teammate",
  "handling ambiguity in requirements",
  "working with a system you didn't design",
  "describe a time you optimized something that was already working",
  "how do you approach code reviews",
  "explain a time you had to learn a new technology quickly",
  "what's the worst code you've written and why",
  "how do you balance technical debt vs new features",
  "describe your debugging process for a production issue",
  "what's a technology you're skeptical about and why",
  "how do you stay updated with new technologies",
  "explain a complex technical concept in simple terms",
  "describe a time you refactored legacy code",
  "what's your approach to writing tests",
  "how do you handle conflicting architectural opinions",
  "describe a time you made a wrong technical choice",
  "what's your process for estimating development time",
  "how do you prioritize technical work",
  "describe a project where you had to work with unfamiliar tech",
  "what's the most interesting bug you've fixed",
  "how do you approach API design",
  "describe your experience with version control",
  "what's your stance on documentation"
];

const GENERAL_INTENTS = [
  "what part of your internship surprised you the most",
  "a responsibility you took that wasn’t assigned",
  "something you shipped that you wouldn’t today",
  "how your background shaped your work style",
  "what you’re proud of that isn’t on your resume",
  "a moment you realized you were out of your depth",
  "how you decide what to learn next",
  "how you handle boring or repetitive work",
  "a time you pushed back respectfully",
  "what kind of teammate you tend to be",
  "describe a time you helped someone without being asked",
  "what motivates you to do your best work",
  "tell me about a time you failed at something",
  "what's the hardest feedback you've received",
  "describe a situation where you had to adapt quickly",
  "what's a mistake you've learned the most from",
  "how do you handle stress and tight deadlines",
  "describe a time you went above and beyond",
  "what's your biggest professional weakness",
  "tell me about a time you showed leadership",
  "how do you handle criticism",
  "describe a time you worked with a difficult person",
  "what's your approach to time management",
  "tell me about a time you made an unpopular decision",
  "how do you prioritize when everything is urgent",
  "describe a time you had to give difficult feedback",
  "what's something you're currently trying to improve",
  "tell me about a time you missed a deadline",
  "how do you balance multiple competing priorities",
  "describe a time you took initiative"
];

const SCENARIO_INTENTS = [
  "deadline vs quality conflict",
  "conflicting feedback from two seniors",
  "project suddenly losing priority",
  "owning a visible failure",
  "working with someone difficult",
  "being asked to do something you disagree with",
  "switching domains quickly",
  "learning under pressure",
  "handling a miscommunication that affected the team",
  "dealing with unclear expectations",
  "managing when you're not the expert",
  "taking over someone else's incomplete work",
  "working with limited resources",
  "balancing stakeholder expectations",
  "dealing with scope creep",
  "handling last-minute requirement changes",
  "managing when a teammate isn't pulling their weight",
  "dealing with imposter syndrome",
  "working on something you find boring",
  "handling ethical concerns at work"
];

const BEHAVIORAL_INTENTS = [
  "describe your greatest professional achievement",
  "tell me about a time you collaborated with others",
  "what's your approach to giving and receiving feedback",
  "describe a time you influenced someone without authority",
  "how do you build relationships with new team members",
  "tell me about a time you had to persuade someone",
  "describe your communication style",
  "what's a time you had to deliver bad news",
  "how do you handle conflict in a team",
  "describe a time you mentored someone",
  "what's your approach to problem-solving",
  "tell me about a time you improved a process",
  "how do you ensure quality in your work",
  "describe a time you dealt with ambiguity",
  "what's your approach to continuous learning"
];

const RESUME_SPECIFIC_INTENTS = [
  "tell me more about [specific project from resume]",
  "what was the most challenging part of [project name]",
  "I see you worked at [company] - what did you learn there",
  "explain this technology you mentioned: [tech from resume]",
  "what made you choose [degree/major]",
  "tell me about [specific skill listed]",
  "what's the story behind [achievement/award]",
  "how did you get interested in [field from resume]",
  "what role did you play in [team project]",
  "what would you do differently in [past project]"
];

const FUNNY_MISMATCH_INTENTS = [
  "why do you think your resume ended up here",
  "what excites you about a role you're not prepared for yet",
  "sell yourself for this role without using your resume",
  "what would you learn first if hired tomorrow",
  "convince me this mismatch is actually a strength",
  "what scares you about this job description",
  "how would you fake competence for week one",
  "what part of this role would frustrate you most",
  "why should we hire someone with your background",
  "what's the biggest gap in your qualifications",
  "how would you explain this career pivot to your parents",
  "what makes you think you can handle this"
];

const SITUATIONAL_QUESTIONS = [
  "if you had to choose between a high-paying boring job and a low-paying exciting job, what would you pick",
  "how would you handle discovering your manager made a major mistake",
  "what would you do if you realized you couldn't meet a deadline",
  "how would you approach your first day at this job",
  "if you had unlimited resources, what would you build",
  "how would you handle a teammate taking credit for your work",
  "what would you do if you disagreed with your entire team",
  "how would you spend your first 90 days here"
];

const WHY_QUESTIONS = [
  "why this company",
  "why this role specifically",
  "why now - why are you looking for this opportunity",
  "why should we hire you over other candidates",
  "why did you choose your field of study",
  "why are you leaving your current position",
  "why do you want to work here",
  "what interests you most about this position"
];

const FUTURE_QUESTIONS = [
  "where do you see yourself in 5 years",
  "what are your long-term career goals",
  "what kind of work environment do you thrive in",
  "what type of problems do you want to solve",
  "what skills do you want to develop",
  "what's your dream job",
  "what impact do you want to make",
  "what kind of team do you want to work with"
];

const RANDOM_WILDCARDS = [
  "what's a controversial opinion you have about your field",
  "if you could master any skill overnight, what would it be",
  "what's the best advice you've ever received",
  "what's something you believed that turned out to be wrong",
  "what's a trend in your industry you disagree with",
  "what book or resource has influenced you the most",
  "what's the worst professional advice you've gotten",
  "what question do you wish I would ask you",
  "if you could work with anyone dead or alive, who and why",
  "what's a skill from your hobby that helps you professionally",
  "describe your work philosophy in one sentence",
  "what's something everyone in your field should know but doesn't",
  "if you had to pivot careers tomorrow, what would you choose",
  "what's a common misconception about your field",
  "what would your TED talk be about"
];

const OFFTOPIC_RELEVANT = [
  "how do you handle burnout",
  "what's your morning routine",
  "how do you stay organized",
  "what podcasts or newsletters do you follow",
  "how do you approach networking",
  "what's your learning style",
  "how do you handle work-life balance",
  "what role does mentorship play in your growth",
  "how do you deal with failure mentally",
  "what's your approach to personal branding",
  "how do you decide what opportunities to pursue",
  "what's your relationship with social media professionally",
  "how do you recharge after intense work periods",
  "what's your note-taking or documentation system",
  "how do you stay motivated during slow periods",
  "what's your philosophy on taking risks",
  "how do you handle imposter syndrome specifically",
  "what role does creativity play in your technical work",
  "how do you build trust with new colleagues remotely",
  "what's your approach to saying no"
];

const INDUSTRY_TRENDS = [
  "what emerging technology excites you most",
  "how do you think AI will impact your field in 5 years",
  "what skill will be most valuable in the next decade",
  "what's outdated in your field that people still use",
  "how is remote work changing your industry",
  "what's a dying practice that you think should stay",
  "what innovation do you think is overhyped",
  "how should education change to prepare people for your field",
  "what's the biggest challenge facing your industry",
  "what role should ethics play in technological advancement"
];

const LEARNING_GROWTH = [
  "describe a time you taught yourself something complex",
  "how do you identify your knowledge gaps",
  "what's the hardest concept you've mastered",
  "how do you practice and retain new skills",
  "what's your process for learning from mistakes",
  "how do you get unstuck when learning something new",
  "what resources do you wish existed for learning your field",
  "how has your learning approach evolved over time",
  "what's something you're currently struggling to learn",
  "how do you balance depth vs breadth in learning"
];

const COLLABORATION_STYLE = [
  "how do you prefer to receive project requirements",
  "what's your ideal team size and structure",
  "how do you handle disagreements about approach",
  "what makes a code review valuable to you",
  "how do you contribute in meetings",
  "what's your communication style under pressure",
  "how do you onboard to a new team's workflow",
  "what's your approach to asking for help",
  "how do you share knowledge with teammates",
  "what makes you a good/bad pair programmer"
];

const PROJECT_PHILOSOPHY = [
  "how do you define 'done' for a project",
  "what's your approach to technical trade-offs",
  "how do you balance speed and quality",
  "what's your stance on premature optimization",
  "how do you decide what to automate",
  "what's your philosophy on shipping MVPs",
  "how do you handle changing requirements mid-project",
  "what's your approach to technical documentation",
  "how do you prioritize non-functional requirements",
  "what's your testing philosophy"
];

const NICHE_SPECIFIC = [
  "if you could rewrite one technology from scratch, what and how",
  "what's a small tool or library that changed how you work",
  "describe your ideal development environment setup",
  "what's a debugging technique that others should know",
  "how do you stay sharp between projects",
  "what's your controversial tech opinion",
  "how do you evaluate new technologies to learn",
  "what's the most underrated aspect of software engineering",
  "how do you handle technical interviews as a candidate",
  "what's your GitHub/portfolio philosophy"
];

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
    const { resumeText="", jobDescription="" } = req.body;

    const resumeDomain = detectDomain(resumeText);
    const jdDomain = detectDomain(jobDescription);
    const mismatch = resumeDomain !== jdDomain && jdDomain !== 'general';
    const sessionId = crypto.randomUUID();
    
    // Extract specific topics from resume for targeted questions
    const resumeTopics = extractResumeTopics(resumeText);
    const randomTopics = randomSample(resumeTopics, 5).join(', ');

    // Randomly select questions from each category (different each time)
    const selectedIntro = randomSample(INTRO_QUESTIONS, 2);
    const selectedExtra = randomSample(EXTRACURRICULAR_QUESTIONS, 2);
    const selectedTech = randomSample(TECH_INTENTS, 8);
    const selectedGeneral = randomSample(GENERAL_INTENTS, 8);
    const selectedScenario = randomSample(SCENARIO_INTENTS, 5);
    const selectedBehavioral = randomSample(BEHAVIORAL_INTENTS, 5);
    const selectedSituational = randomSample(SITUATIONAL_QUESTIONS, 3);
    const selectedWhy = randomSample(WHY_QUESTIONS, 3);
    const selectedFuture = randomSample(FUTURE_QUESTIONS, 3);
    const selectedWildcards = randomSample(RANDOM_WILDCARDS, 4);
    const selectedOffTopic = randomSample(OFFTOPIC_RELEVANT, 5);
    const selectedTrends = randomSample(INDUSTRY_TRENDS, 3);
    const selectedLearning = randomSample(LEARNING_GROWTH, 3);
    const selectedCollaboration = randomSample(COLLABORATION_STYLE, 3);
    const selectedProject = randomSample(PROJECT_PHILOSOPHY, 3);
    const selectedNiche = randomSample(NICHE_SPECIFIC, 3);
    const selectedMismatch = randomSample(FUNNY_MISMATCH_INTENTS, 2);

    const prompt = `
You are an expert interviewer. Create 5 COMPLETELY UNIQUE questions that have NEVER been asked before.

SESSION: ${sessionId}
Domains: Resume=${resumeDomain}, JD=${jdDomain}
Mismatch: ${mismatch}

KEY RESUME TOPICS/SKILLS DETECTED:
${randomTopics}

Resume:
${resumeText.slice(0,2500)}

Job Description:
${jobDescription.slice(0,1500)}

CRITICAL RULES:
- Create 5 questions that feel fresh and unexpected
- Mix multiple question types randomly
- Reference specific resume details (projects, companies, skills, achievements)
- Incorporate the detected topics: ${randomTopics}
- Go slightly off-topic but keep it relevant to domain
- Vary formality: some casual, some formal
- NO REPETITIVE PATTERNS

RANDOM QUESTION POOL (pick from DIFFERENT categories each time):

Intro: ${selectedIntro.join(' | ')}
Extracurricular: ${selectedExtra.join(' | ')}
Technical: ${selectedTech.join(' | ')}
Behavioral: ${selectedGeneral.join(' | ')}
Scenarios: ${selectedScenario.join(' | ')}
Deep-Dive: ${selectedBehavioral.join(' | ')}
Situational: ${selectedSituational.join(' | ')}
Why: ${selectedWhy.join(' | ')}
Future: ${selectedFuture.join(' | ')}
Wildcards: ${selectedWildcards.join(' | ')}
Off-Topic: ${selectedOffTopic.join(' | ')}
Trends: ${selectedTrends.join(' | ')}
Learning: ${selectedLearning.join(' | ')}
Collaboration: ${selectedCollaboration.join(' | ')}
Project Philosophy: ${selectedProject.join(' | ')}
Niche: ${selectedNiche.join(' | ')}
${mismatch ? `Mismatch: ${selectedMismatch.join(' | ')}` : ''}

REQUIRED MIX (randomize this):
- ${Math.random() > 0.5 ? '1 intro question' : '1 why/future question'}
- ${resumeDomain === 'tech' ? '1-2 technical questions' : '1-2 domain-specific questions'}
- 1 behavioral or scenario
- 1 off-topic but relevant (trends, learning, collaboration)
- 1 wildcard or resume-specific

CUSTOMIZATION:
- If resume mentions specific project/tech: ask about it directly
- If resume has awards: ask about the story behind them
- If resume shows career change: explore the transition
- Reference actual company names, tech stack, or achievements

OUTPUT FORMAT:
RAW JSON ONLY
[
 { "question": "...", "answer": "Expected direction in 3-5 lines" }
]
`;

    const raw = await tryGenerate(prompt);
    const json = cleanJson(raw);

    res.json({ qaPairs: JSON.parse(json) });

  } catch {
    res.json({
      qaPairs: [{ question: "Generation failed", answer: "Retry" }]
    });
  }
});

/* ---------- EVALUATE ---------- */

app.post('/api/evaluate-answer', async (req,res)=>{
  const { question, userAnswer } = req.body;

  const prompt = `
Evaluate answer quality. Be honest, not polite.

Q: ${question}
A: ${userAnswer}

Return RAW JSON:
{
 "rating": "Green" | "Yellow" | "Red",
 "score": 0-100,
 "feedback": "2 sentences",
 "improvement_tip": "1 tip"
}
`;

  try {
    const raw = await tryGenerate(prompt);
    res.json(JSON.parse(raw.replace(/```json|```/g,'')));
  } catch {
    res.json({ rating:"Yellow", score:50, feedback:"Error", improvement_tip:"Clarify thinking" });
  }
});

app.listen(PORT, ()=>console.log(`✅ Server on ${PORT}`));
