import type { ProblemBrief } from "./problem-brief";

const unknown = "Unknown";

const symptomPattern =
  /\b(?:miss(?:ed|es|ing)\s+(?:project\s+)?deadlines?|deadline(?:s)?\s+(?:are|were|have been)\s+missed|complain(?:ing|ts?)\s+(?:more|increased|have increased)|complaints?\s+(?:have\s+)?increas(?:ed|ing)|(?:orders?|deliveries|projects?|requests?)\s+(?:are\s+)?(?:late|overdue|delayed)|running out|run out|backlog|taking too long|too long|(?:approval|review)\s+process(?:es)?\s+(?:is|are)\s+too long|the delay\b|too many errors?|(?:operational\s+)?issues?|problems?|failures?)\b/i;

function splitSentences(transcript: string) {
  return transcript
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .flatMap((sentence) => sentence.split(/,\s+(?=(?:and|but)\s+(?:i|we|they|our|the|some|others?|managers?|customers?|team|operations|staff|suppliers?)\b)|\s+(?:and|but)\s+(?=(?:i|we|they|our|the|some|others?|managers?|customers?|team|operations|staff|suppliers?)\b)|\s+(?:while|whereas)\s+/i))
    .map((sentence) => sentence.replace(/^(?:and|but|while|whereas)\s+/i, "").replace(/^[,;:\s]+|[,;:\s]+$/g, "").trim())
    .filter(Boolean);
}

function unique(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = value.toLocaleLowerCase().replace(/[.!?]+$/g, "");
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function asBulletList(values: string[]) {
  const items = unique(values);
  return items.length ? items.map((item) => `• ${item}`).join("\n") : unknown;
}

function cleanPhrase(value: string) {
  return value
    .replace(/^(?:and|but|while|whereas|that)\s+/i, "")
    .replace(/^(?:there\s+(?:is|are)|it(?:'s|\s+(?:is|could be|might be))|we(?:'re| are)|they(?:'re| are))\s+/i, "")
    .replace(/^(?:i|we)\s+(?:think|believe|suspect)\s+/i, "")
    .replace(/^(?:actually|possibly|maybe)\s+/i, "")
    .replace(/\b(?:recently|lately|these days)\b[,.]?/gi, "")
    .replace(/\s+/g, " ")
    .replace(/^[,;:\s]+|[,;:\s]+$/g, "")
    .replace(/[.!?]+$/g, "")
    .trim();
}

function capitalize(value: string) {
  const cleaned = cleanPhrase(value);
  return cleaned ? cleaned[0].toLocaleUpperCase() + cleaned.slice(1) : "";
}

function extractCauses(sentences: string[]) {
  const causes: string[] = [];

  for (const sentence of sentences) {
    const clauses = sentence.split(/\b(?:while|whereas|and others?|but others?)\b/i);
    for (const clause of clauses) {
      const attributed = clause.match(
        /(?:\b(?:some|other|many|several|a few)\s+people|\bpeople|\bothers?|\bmanagers?|\boperations|\bthe team)\s+(?:also\s+)?(?:are\s+)?(?:saying|say|says|think|thinks|believe|believes|suspect|suspects|feel|feels|suggest|suggests)\s+(?:that\s+)?(.+)/i,
      );
      const personalTheory = clause.match(
        /\b(?:i|we)\s+(?:think|believe|suspect)\s+(?:that\s+)?(?:it\s+(?:could|might|may)\s+be\s+)?(?:because\s+)?(.+)/i,
      );
      const causal = clause.match(/\b(?:because|due to|caused by)\s+(.+)/i);
      const explicitAlternatives = clause.match(
        /\b(?:the\s+)?(?:main\s+)?(?:cause|reason)\s+is\s+(.+)/i,
      );
      const uncertaintyAlternatives = clause.match(
        /\b(?:whether|if)\s+(.+?)\s+(?:or|and)\s+(.+)/i,
      );
      const candidate =
        attributed?.[1] ??
        personalTheory?.[1] ??
        causal?.[1] ??
        explicitAlternatives?.[1] ??
        (uncertaintyAlternatives
          ? `${uncertaintyAlternatives[1]} or ${uncertaintyAlternatives[2]}`
          : undefined);

      if (candidate) {
        const alternatives = candidate.split(/\s*,\s*|\s+\bor\s+(?:maybe\s+)?/i);
        for (const alternative of alternatives) {
          const normalized = normalizeCause(alternative);
          if (normalized) causes.push(normalized);
        }
      }
    }
  }

  return unique(causes);
}

function normalizeCause(candidate: string) {
  let cause = cleanPhrase(candidate)
    .replace(/^or\s+/i, "")
    .replace(/^because\s+/i, "")
    .replace(/,\s*(?:and\s+)?(?:i|we)\s+(?:want|need|would like|hope|aim)\s+to\b.*$/i, "")
    .replace(/^(?:the reason is|the issue is|it is because)\s+/i, "")
    .replace(/^of\s+/i, "")
    .replace(/^(?:we|they|the team)\s+(?:are|'re)\s+(?:being\s+)?understaffed$/i, "Understaffing")
    .replace(/^(?:there are|there is)\s+/i, "");

  if (/^understaffed$/i.test(cause)) cause = "Understaffing";
  const changingRequirements = cause.match(/^(?:the\s+)?requirements?\s+(?:keep|keeps|are|is)\s+chang(?:e|ing)$/i);
  if (changingRequirements) cause = "Changing requirements";

  const understaffed = cause.match(/^(?:we|they|the team)\s+(?:are|'re)\s+understaffed$/i);
  if (understaffed) cause = "Understaffing";

  cause = cause.replace(/^(?:a|an|the)\s+/i, "");
  return capitalize(cause);
}

function extractSymptoms(sentences: string[]) {
  return sentences.filter((sentence) => {
    if (!symptomPattern.test(sentence)) return false;
    if (/\b(?:i think|i believe|i suspect|maybe|possibly|perhaps|not sure whether|not certain whether|because|due to|caused by)\b/i.test(sentence)) {
      return false;
    }
    if (/\b(?:some|other|many|several|a few)\s+(?:people|managers)\s+(?:also\s+)?(?:say|think|believe|suspect|feel)\b/i.test(sentence)) {
      return false;
    }
    return true;
  });
}

function conciseProblemStatement(symptom: string) {
  if (/\bmiss(?:ed|es|ing)\s+(?:project\s+)?deadlines?|\bdeadline(?:s)?\s+(?:are|were|have been)\s+missed/i.test(symptom)) {
    return "Project deadlines are being missed.";
  }
  if (/\bcomplain(?:ing|ts?)\s+(?:more|increased|have increased)|\bcomplaints?\s+(?:have\s+)?increas(?:ed|ing)/i.test(symptom)) {
    return "Customer complaints are increasing.";
  }
  const issueSubject = symptom.match(/^(?:our|the)\s+(.+?)\s+(?:has|have)\s+been\s+(?:having|experiencing)\s+(?:operational\s+)?(?:issues?|problems?)/i);
  if (issueSubject) return `${capitalize(issueSubject[1])} is experiencing operational issues.`;
  if (/\bapproval process\b|\bthe delay\b/i.test(symptom)) return "The cause of the delay is unclear.";
  const withoutLeadIn = symptom
    .replace(/^(?:our|the)\s+(?:team|staff|employees?)\s+(?:has|have)\s+been\s+/i, "")
    .replace(/^(?:our|the)\s+/i, "")
    .replace(/\b(?:recently|lately|these days)\b/gi, "")
    .trim()
    .replace(/\s+/g, " ");
  if (!withoutLeadIn) return unknown;
  return capitalize(withoutLeadIn.replace(/[.!?]*$/, "")) + ".";
}

function factualSymptom(symptom: string) {
  if (/\bmiss(?:ed|es|ing)\s+(?:project\s+)?deadlines?|\bdeadline(?:s)?\s+(?:are|were|have been)\s+missed/i.test(symptom)) {
    return "The team has been missing project deadlines.";
  }
  if (/\bcomplain(?:ing|ts?)\s+(?:more|increased|have increased)|\bcomplaints?\s+(?:have\s+)?increas(?:ed|ing)/i.test(symptom)) {
    return "Customer complaints have increased.";
  }
  const issueSubject = symptom.match(/^(?:our|the)\s+(.+?)\s+(?:has|have)\s+been\s+(?:having|experiencing)\s+(?:operational\s+)?(?:issues?|problems?)/i);
  if (issueSubject) return `The ${issueSubject[1]} is experiencing operational issues.`;
  if (/\bapproval process\b|\bthe delay\b/i.test(symptom)) return "A delay is occurring.";
  return capitalize(symptom.replace(/\b(?:recently|lately|these days)\b/gi, "").replace(/[.!?]*$/, "")) + ".";
}

function extractStakeholders(transcript: string) {
  const teamLabel = /\bproject\b/i.test(transcript) ? "Project team" : "Team";
  const stakeholderPatterns: Array<[RegExp, string]> = [
    [/\bdelivery team\b/i, "Delivery team"],
    [/\bproject team\b/i, "Project team"],
    [/\b(?:our|the)\s+team\b|\bteam\b/i, teamLabel],
    [/\bproject managers?\b|\bmanagers?\b/i, "Managers"],
    [/\boperations\b/i, "Operations"],
    [/\bcustomers?\b/i, "Customers"],
    [/\blogistics partners?\b/i, "Logistics partner"],
    [/\bsuppliers?\b/i, "Suppliers"],
    [/\bvendors?\b/i, "Vendors"],
    [/\bwarehouse staff\b|\bwarehouse team\b/i, "Warehouse team"],
    [/\bemployees?\b|\bstaff\b/i, "Staff"],
    [/\bclients?\b/i, "Clients"],
  ];
  const stakeholders = unique(
    stakeholderPatterns
      .filter(([pattern]) => pattern.test(transcript))
      .map(([, stakeholder]) => stakeholder),
  );
  return stakeholders.filter((stakeholder) => stakeholder !== "Team" || !stakeholders.includes("Delivery team"));
}

function deriveContext(transcript: string, symptom: string | undefined) {
  if (!symptom) return unknown;
  if (/\bproject\b/i.test(transcript) && /\bdeadline/i.test(symptom) && /\bteam\b/i.test(transcript)) {
    return "The issue is affecting the team’s ability to deliver projects on time.";
  }

  const timeContext = transcript.match(/\b(?:recently|lately|this (?:week|month|quarter|year)|last (?:week|month|quarter|year))\b/i);
  const durationContext = transcript.match(/\b(?:over|during|for)\s+(?:the\s+)?(?:last|past|previous)\s+[^,.!?]+/i);
  const explicitContext = transcript.match(/\b(?:during|since|across|in|at)\s+(?:our\s+)?(?:project|delivery|order|production|hiring|busy|peak|holiday|quarter|month|week)[^,.!?]*/i);
  if (durationContext) {
    const symptomDescription = /\bcomplain/i.test(symptom)
      ? "Customer complaints have increased"
      : conciseProblemStatement(symptom).replace(/[.!?]$/, "");
    return `${symptomDescription} ${durationContext[0]}.`;
  }
  if (explicitContext) return capitalize(explicitContext[0]) + ".";
  if (timeContext) return `The issue has been observed ${timeContext[0]}.`;
  return unknown;
}

function extractDesiredOutcome(transcript: string, symptom: string | undefined) {
  const intent = transcript.match(
    /\b(?:i|we)\s+(?:want|need|would like|hope|aim)\s+to\s+([^.!?]+)/i,
  );
  if (!intent) return unknown;

  const objective = cleanPhrase(intent[1])
    .replace(/^understand\s+what\s+is\s+actually\s+causing\s+(?:the\s+)?(?:project\s+)?delays?\s+and\s+what\s+we\s+should\s+fix\s+first$/i, "identify the main causes of the project delays and determine what should be fixed first")
    .replace(/^understand\s+what\s+is\s+actually\s+causing\s+(?:the\s+)?(?:project\s+)?delays?$/i, "identify the causes of the project delays")
    .replace(/\bwhat we should fix first\b/i, "what should be fixed first")
    .replace(/\s+and\s+/i, " and ");

  if (!objective) return unknown;
  if (/\bidentify the main causes of the project delays/i.test(objective)) {
    return "Identify the main causes of the project delays and determine what should be fixed first.";
  }
  if (/^(?:understand|identify|determine|find out|learn|improve|reduce|resolve|fix|increase|decrease|decide)\b/i.test(objective)) {
    return capitalize(objective.replace(/[.!?]*$/, "")) + ".";
  }
  if (/^understand what is causing/i.test(objective) && symptom) {
    return `Identify the cause of ${conciseProblemStatement(symptom).replace(/[.!?]$/, "").toLocaleLowerCase()}.`;
  }
  return capitalize(objective.replace(/[.!?]*$/, "")) + ".";
}

function extractUnknowns(transcript: string, causes: string[], symptom: string | undefined) {
  const expressesUncertainty = /\b(?:not (?:exactly |really |completely )?sure|unsure|don't know|do not know|unclear|uncertain|no idea|wondering|what is actually causing|what's actually causing|figure out whether)\b/i.test(transcript);
  if (!expressesUncertainty) return [];

  const issue = symptom && /\bdeadline/i.test(symptom) ? "the project delays" : "the issue";
  if (!causes.length) return [`What is causing ${issue}?`];
  const causeQuestions = causes.map((cause) => {
    if (/^response time$/i.test(cause)) {
      return "Whether response time is contributing to customer complaints.";
    }
    if (/^product quality$/i.test(cause)) {
      return "Whether product quality is contributing to customer complaints.";
    }
    if (/^approval process is too long$/i.test(cause)) {
      return "Whether the approval process is contributing to the issue.";
    }
    if (/^too many approval stages$/i.test(cause)) {
      return "Whether approval stages are actually creating significant delays.";
    }
    if (/^understaffing$/i.test(cause)) {
      return "Whether staffing levels are sufficient.";
    }
    if (/^changing requirements$/i.test(cause)) {
      return "Whether changing requirements are contributing to the delays.";
    }
    if (/^logistics partner$/i.test(cause)) {
      return "Whether the logistics partner is contributing to the issue.";
    }
    const plural = /^(?:too many|changing requirements|multiple)\b/i.test(cause);
    return `Whether ${cause.toLocaleLowerCase()} ${plural ? "are" : "is"} contributing to ${issue}.`;
  });
  const unknowns = causeQuestions;
  if (causes.length > 1) unknowns.unshift(`Which possible cause contributes most to ${issue}.`);
  return unique(unknowns);
}

function summarizeKnownFacts(symptoms: string[], causeCount: number) {
  const facts = symptoms.map(factualSymptom);
  if (causeCount > 1) facts.push("Multiple possible causes have been mentioned.");
  return unique(facts);
}

export const problemBriefService = {
  structure(transcript: string): ProblemBrief {
    const cleaned = transcript.trim().replace(/\s+/g, " ");
    if (!cleaned) {
      return {
        problemStatement: unknown,
        businessContext: unknown,
        observableSymptoms: unknown,
        knownFacts: unknown,
        possibleCauses: unknown,
        stakeholders: unknown,
        desiredOutcome: unknown,
        importantUnknowns: unknown,
        assumptions: unknown,
      };
    }

    const sentences = splitSentences(cleaned);
    const causes = extractCauses(sentences);
    const symptoms = extractSymptoms(sentences);
    if (!symptoms.length && /\bthe delay\b/i.test(cleaned)) symptoms.push("the delay");
    const primarySymptom = symptoms[0];
    const unknowns = extractUnknowns(cleaned, causes, primarySymptom);
    const facts = summarizeKnownFacts(symptoms, causes.length);

    return {
      problemStatement: primarySymptom ? conciseProblemStatement(primarySymptom) : unknown,
      businessContext: deriveContext(cleaned, primarySymptom),
      observableSymptoms: symptoms.length ? asBulletList(symptoms.map(conciseProblemStatement)) : unknown,
      knownFacts: asBulletList(facts),
      possibleCauses: asBulletList(causes),
      stakeholders: asBulletList(extractStakeholders(cleaned)),
      desiredOutcome: extractDesiredOutcome(cleaned, primarySymptom),
      importantUnknowns: asBulletList(unknowns),
      assumptions: unknown,
    };
  },
};
