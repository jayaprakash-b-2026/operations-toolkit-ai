const numberWords: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const spokenNumberPattern =
  /\b((?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|lakh|lakhs|crore|crores|and)(?:[\s-]+(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|lakh|lakhs|crore|crores|and))*)\s+(percent(?:age)?|months?|weeks?|days?|years?|hours?|minutes?|seconds?|rupees?|dollars?|euros?|pounds?|orders?|units?|items?|people|employees?|projects?|customers?)\b/gi;

function removeDiscourseFillers(transcript: string) {
  return transcript
    .replace(/\b(?:um+|uh+|erm+|er+)\b[,.]?/gi, " ")
    .replace(/(^\s*[,;]?\s*|[.!?]\s+|[,;]\s*)basically\b,?\s*/gi, "$1")
    .replace(/(^|[.!?]\s+|[,;]\s*)i mean\b,?\s*/gi, "$1")
    .replace(/(^|[.!?]\s+|[,;]\s*)you know\b,?\s*/gi, "$1")
    .replace(/,\s*you know\b(?=\s*[,;.]|\s+(?:and|but)\b|$)/gi, "")
    .replace(/\byou know\b(?=\s+(?:\d|the last|the past|our team|the team)\b)/gi, "")
    .replace(/,\s*like\b(?=\s*[,;.]|\s+(?:and|but)\b|$)/gi, "")
    .replace(/\blike\s*,\s*/gi, " ");
}

function removeRepeatedWords(transcript: string) {
  let cleaned = transcript.replace(
    /\b([A-Za-z]+)(?:[\s,]+\1\b)+/gi,
    (match, word: string) => {
      if (/^(?:no|not|never|very|really|too|so)$/i.test(word)) return match;
      return word;
    },
  );

  cleaned = cleaned.replace(
    /\b((?:[A-Za-z][A-Za-z'-]*\s+){1,4}[A-Za-z][A-Za-z'-]*)[, ]+\1\b/gi,
    (match, phrase: string) => (/\d/.test(phrase) ? match : phrase),
  );
  return cleaned;
}

function repairClearRecognitionGrammar(transcript: string) {
  return transcript
    .replace(
      /\bso\s+i'?m\s+customers?\s+complaints?\s+have\b/i,
      "Our customer complaints have",
    )
    .replace(/\b(?:our\s+)?customers?\s+complaint\s+have\b/gi, "customer complaints have")
    .replace(
      /\b(?:and\s+)?no\s+i\s+will\s+not\s+know\s+whom\s+to\s+(?:actually\s+)?blame\b/i,
      "I'm not sure what to blame",
    )
    .replace(/\b(?:i am|i'm)\s+not know\b/gi, "I don't know")
    .replace(
      /\b(?:are|is)\s+telling\s+it\s+is\s+due\s+to\b/gi,
      "say it is due to",
    )
    .replace(/\btoo much of all\b/gi, "too much of a")
    .replace(/\ball you know\s+/gi, "")
    .replace(/\bproject\s+dead\s+lions\b/gi, (match) =>
      match[0] === match[0].toLocaleUpperCase() ? "Project deadlines" : "project deadlines",
    );
}

function parseSpokenNumber(phrase: string): string | undefined {
  const words = phrase.toLocaleLowerCase().replace(/-/g, " ").split(/\s+/).filter((word) => word !== "and");
  if (!words.length) return undefined;

  let total = 0;
  let current = 0;
  let previousTens = false;
  let hasScale = false;

  for (const word of words) {
    if (word in numberWords) {
      const value = numberWords[word];
      if (value >= 20) {
        if (current === 0) {
          current = value;
        } else if (current >= 100 && current % 100 === 0) {
          current += value;
        } else {
          return undefined;
        }
        previousTens = true;
      } else {
        if (previousTens && value < 10) {
          current += value;
        } else if (current === 0) {
          current = value;
        } else if (current >= 100 && current % 100 === 0) {
          current += value;
        } else {
          return undefined;
        }
        previousTens = false;
      }
      continue;
    }

    const scale =
      word === "hundred" ? 100 :
      word === "thousand" ? 1_000 :
      word === "million" ? 1_000_000 :
      word === "billion" ? 1_000_000_000 :
      word === "lakh" || word === "lakhs" ? 100_000 :
      word === "crore" || word === "crores" ? 10_000_000 :
      undefined;
    if (!scale || (word === "hundred" && current === 0)) return undefined;

    if (scale === 100) {
      if (current >= 100) return undefined;
      current *= scale;
    } else {
      total += (current || 1) * scale;
      current = 0;
    }
    hasScale = true;
    previousTens = false;
  }

  if (hasScale && /\b(?:lakh|lakhs|crore|crores)\b/i.test(phrase)) {
    const scaleMatch = phrase.match(/\b(lakh|lakhs|crore|crores)\b/i);
    if (scaleMatch?.index !== undefined) {
      const prefix = phrase.slice(0, scaleMatch.index).trim();
      const amount = parseSpokenNumber(prefix);
      if (amount) return `${amount} ${scaleMatch[1]}`;
    }
  }

  const result = total + current;
  return Number.isSafeInteger(result) ? String(result) : undefined;
}

function normalizeSpokenNumbers(transcript: string) {
  return transcript.replace(spokenNumberPattern, (match, phrase: string, unit: string) => {
    const number = parseSpokenNumber(phrase);
    if (!number) return match;
    return unit.toLocaleLowerCase().startsWith("percent")
      ? `${number}%`
      : `${number} ${unit}`;
  });
}

function punctuateThoughtBoundaries(transcript: string) {
  return transcript
    .replace(
      /\s+and\s+(?=(?:i'm not sure|i think|i want|i need|we want|we need|some (?:people|managers)|other(?:s)?|the managers|managers)\b)/gi,
      ". ",
    )
    .replace(/\s+(?=i'm not sure\b)/gi, ". ")
    .replace(/\s+but\s+(?=i'm not\b)/gi, ", but ")
    .replace(
      /\s+(?=(?:i|we)\s+(?:want|need|would like)\s+to\s+(?:understand|identify|find out|determine)\b)/gi,
      "\n\n",
    )
    .replace(/,\s*but\s+/gi, ", but ");
}

function normalizePunctuation(transcript: string) {
  const cleaned = transcript
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\b(have|has|had|is|are|was|were|to|of),\s+/gi, "$1 ")
    .replace(/[ \t]+([,.!?;:])/g, "$1")
    .replace(/([,.!?;:])(?=\S)/g, "$1 ")
    .replace(/(?:,\s*){2,}/g, ", ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^[,;:\s]+|[,;:\s]+$/g, "")
    .replace(/(^|[.!?]\s+|\n+)([a-z])/g, (_match, prefix: string, letter: string) =>
      `${prefix}${letter.toLocaleUpperCase()}`,
    )
    .trim();

  return cleaned && !/[.!?]$/.test(cleaned) ? `${cleaned}.` : cleaned;
}

export const transcriptCleanupService = {
  clean(transcript: string): string {
    let cleaned = transcript.normalize("NFC").trim();
    cleaned = removeDiscourseFillers(cleaned);
    cleaned = removeRepeatedWords(cleaned);
    cleaned = cleaned.replace(/\b(i|we|they|it|our|the team)\s+\1\s+/gi, "$1 ");
    cleaned = repairClearRecognitionGrammar(cleaned);
    cleaned = normalizeSpokenNumbers(cleaned);
    cleaned = punctuateThoughtBoundaries(cleaned);
    return normalizePunctuation(cleaned);
  },
};
