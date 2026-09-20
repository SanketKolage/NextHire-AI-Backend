const PERSONAL_OR_LEGAL_PATTERNS = [
  "passport",
  "citizenship",
  "visa",
  "immigration",
  "legal",
  "authorization",
  "ssn",
  "tax",
  "background",
  "disability",
  "criminal",
  "conviction",
  "gender",
  "marital",
  "religion",
  "political",
  "salary expectation",
  "why should we hire you",
  "why do you want to join us",
  "why do you want to work here",
  "tell us about your experience with react",
  "tell us about your experience with node",
  "tell us about your experience with javascript",
  "why should i hire you",
];

function normalizeQuestion(question = "") {
  return String(question).toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

function isPersonalOrLegalQuestion(question = "") {
  const normalized = normalizeQuestion(question);
  return PERSONAL_OR_LEGAL_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function buildAnswer(resumeParsed = {}, question = "") {
  const normalized = normalizeQuestion(question);

  if (isPersonalOrLegalQuestion(question)) {
    return { answer: "User input required.", requiresUserInput: true };
  }

  const skills = [...(resumeParsed.skills || []), ...(resumeParsed.techStack || []), ...(resumeParsed.technicalSkills || [])];
  const experienceYears = Number(resumeParsed.totalYearsExperience || resumeParsed.yearsOfExperience || 0);
  const summary = resumeParsed.summary || "";

  const questionMap = [
    {
      test: /why do you want to join us|why do you want to work here|why should we hire you|why should i hire you/,
      answer: `I am interested in this opportunity because it aligns with my background in ${skills.slice(0, 4).join(", ") || "software development"} and my focus on building reliable, user-centered solutions. I bring ${experienceYears || "several"} years of experience, a collaborative working style, and a strong willingness to contribute meaningfully to the team.`,
    },
    {
      test: /tell us about your experience with react|experience with react|react/,
      answer: `My experience with React includes building interface-driven applications and working with component-based architecture, state management, and responsive UI development. I have used React to deliver maintainable front-end experiences while collaborating closely with backend teams to ship full-featured product work.`,
    },
    {
      test: /tell us about your experience with node|node.js|nodejs/,
      answer: `My experience with Node.js includes building backend services, API workflows, and integrations that support application functionality. I focus on clean service design, API reliability, and efficient data handling to ensure smooth end-to-end product behavior.`,
    },
    {
      test: /tell us about your experience with javascript|javascript/,
      answer: `I have worked extensively with JavaScript across front-end and back-end workflows, including building interactive applications, API integrations, and logic-heavy product features. I value writing maintainable, testable code and building interfaces that are both performant and understandable.`,
    },
  ];

  const matched = questionMap.find((entry) => entry.test.test(normalized));
  if (matched) {
    return { answer: matched.answer, requiresUserInput: false };
  }

  if (summary) {
    return {
      answer: `${summary} I bring a practical, product-focused background and aim to contribute effectively in a role that matches my skills and experience.`,
      requiresUserInput: false,
    };
  }

  return {
    answer: `I bring a strong technical foundation, hands-on product experience, and a collaborative mindset that helps teams deliver reliable outcomes.`,
    requiresUserInput: false,
  };
}

module.exports = { buildAnswer, isPersonalOrLegalQuestion };
