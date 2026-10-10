import { addDays, addMonths, addWeeks, setHours, setMinutes, setSeconds, format, parseISO } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { ParsedTaskInput, TaskPriority, RecurrenceFrequency } from './types';
import { DEFAULT_TIMEZONE, isValidTimezone } from './date';

const KNOWN_PROJECTS: Record<string, string> = {
  calflow: 'Calflow',
  rimev: 'Rimev',
  klay: 'Klay',
  'personal website': 'Personal Website',
  'personal site': 'Personal Website',
  instareels: 'Instagram/Reels Automation',
};

const KNOWN_MERCHANTS = [
  'Amazon',
  'Flipkart',
  'Swiggy',
  'Zomato',
  'Myntra',
  'Apple',
  'Google',
  'Blinkit',
  'Zepto',
  'Instamart',
  'Nike',
  'Adidas',
];

const KNOWN_CATEGORIES: Record<string, string> = {
  bill: 'Finances',
  bills: 'Finances',
  payment: 'Finances',
  subscription: 'Finances',
  invest: 'Finances',
  tax: 'Finances',
  taxes: 'Finances',
  gym: 'Health & Fitness',
  workout: 'Health & Fitness',
  doctor: 'Health & Fitness',
  medicine: 'Health & Fitness',
  amazon: 'Shopping & Purchases',
  flipkart: 'Shopping & Purchases',
  buy: 'Shopping & Purchases',
  purchase: 'Shopping & Purchases',
  leetcode: 'Learning & Career',
  interview: 'Learning & Career',
  spring: 'Learning & Career',
  java: 'Learning & Career',
  reel: 'Content & Creativity',
  instagram: 'Content & Creativity',
  blog: 'Content & Creativity',
  trek: 'Travel & Experiences',
  flight: 'Travel & Experiences',
  hotel: 'Travel & Experiences',
  trip: 'Travel & Experiences',
  idea: 'Ideas & Someday',
  errand: 'Personal & Life Admin',
};

export function parseNaturalLanguageTask(
  input: string,
  tz: string = DEFAULT_TIMEZONE
): ParsedTaskInput {
  const safeTz = isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE;
  const now = toZonedTime(new Date(), safeTz);

  const raw = input.trim();
  let title = raw;
  let priority: TaskPriority | undefined;
  let dueDate: string | undefined;
  let reminderTime: string | undefined;
  let recurrenceRule: { frequency: RecurrenceFrequency; interval?: number } | undefined;
  let projectName: string | undefined;
  let categoryName: string | undefined;
  let merchant: string | undefined;
  let url: string | undefined;
  let estimatedAmount: number | undefined;

  // 1. Extract URL
  const urlMatch = raw.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) {
    url = urlMatch[0];
    title = title.replace(urlMatch[0], '').trim();
  }

  // 2. Extract Merchant
  for (const m of KNOWN_MERCHANTS) {
    const mRegex = new RegExp(`\\b(from|at|on)?\\s*${m}\\b`, 'i');
    if (mRegex.test(raw)) {
      merchant = m;
      // Do not strip the merchant if it's part of essential title, or optionally retain
      break;
    }
  }

  // 3. Extract Amount (e.g. $50, ₹500, Rs. 500, 50 USD, 500 rupees)
  const amountMatch = raw.match(/(?:[$₹]|Rs\.?|INR)\s*(\d+(?:\.\d{1,2})?)|(\d+(?:\.\d{1,2})?)\s*(?:dollars?|rupees?|inr|usd)/i);
  if (amountMatch) {
    const val = amountMatch[1] || amountMatch[2];
    if (val) {
      estimatedAmount = parseFloat(val);
    }
  }

  // 4. Extract Project
  for (const [key, proj] of Object.entries(KNOWN_PROJECTS)) {
    const pRegex = new RegExp(`\\b${key}\\b`, 'i');
    if (pRegex.test(raw)) {
      projectName = proj;
      break;
    }
  }

  // 5. Extract Priority
  if (/\b(urgent|asap|emergency|crit(?:ical)?|highest priority)\b/i.test(raw)) {
    priority = 'URGENT';
    title = title.replace(/\b(urgent|asap|emergency|highest priority)\b/gi, '').trim();
  } else if (/\b(high priority|important|priority high)\b/i.test(raw)) {
    priority = 'HIGH';
    title = title.replace(/\b(high priority|important|priority high)\b/gi, '').trim();
  } else if (/\b(low priority|when free|sometime|someday)\b/i.test(raw)) {
    priority = 'LOW';
    title = title.replace(/\b(low priority|when free)\b/gi, '').trim();
  }

  // 6. Recurrence check: "remind me every Monday at 9 AM" or "every week"
  const recurrenceMatch = raw.match(/\bevery\s+(day|daily|monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month)\b/i);
  if (recurrenceMatch) {
    const freqWord = recurrenceMatch[1].toLowerCase();
    if (freqWord === 'day' || freqWord === 'daily') {
      recurrenceRule = { frequency: 'DAILY', interval: 1 };
    } else if (freqWord === 'week' || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(freqWord)) {
      recurrenceRule = { frequency: 'WEEKLY', interval: 1 };
    } else if (freqWord === 'month') {
      recurrenceRule = { frequency: 'MONTHLY', interval: 1 };
    }
  }

  // 7. Time extractor (e.g. "at 9 AM", "at 14:30", "at 6pm")
  let targetHours: number | undefined;
  let targetMinutes: number | undefined;
  const timeMatch = raw.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (timeMatch) {
    let h = parseInt(timeMatch[1], 10);
    const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3]?.toLowerCase();
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    targetHours = h;
    targetMinutes = m;
  }

  // 8. Distinguish Reminder vs Due date
  const isExplicitReminder = /\bremind(?:\s+me)?\b/i.test(raw);

  // Date parsing logic
  let targetDate: Date | null = null;

  if (/\btomorrow\b/i.test(raw)) {
    targetDate = addDays(now, 1);
  } else if (/\bnext month\b/i.test(raw)) {
    targetDate = addMonths(now, 1);
  } else if (/\bnext week\b/i.test(raw)) {
    targetDate = addWeeks(now, 1);
  } else {
    // "on the 15th" or "15th"
    const dayOfMonthMatch = raw.match(/\b(?:on\s+the\s+|on\s+)?(\d{1,2})(?:st|nd|rd|th)\b/i);
    if (dayOfMonthMatch) {
      const dayNum = parseInt(dayOfMonthMatch[1], 10);
      if (dayNum >= 1 && dayNum <= 31) {
        const candidate = new Date(now);
        candidate.setDate(dayNum);
        if (candidate < now) {
          // If the day in this month has passed, set to next month
          targetDate = addMonths(candidate, 1);
        } else {
          targetDate = candidate;
        }
      }
    }
  }

  if (targetDate) {
    const h = targetHours !== undefined ? targetHours : 9; // default 9:00 AM
    const m = targetMinutes !== undefined ? targetMinutes : 0;
    targetDate = setHours(setMinutes(setSeconds(targetDate, 0), m), h);

    const isoString = formatInTimeZone(targetDate, safeTz, "yyyy-MM-dd'T'HH:mm:ssXXX");

    if (isExplicitReminder) {
      reminderTime = isoString;
      // also assign due date if not set
      dueDate = isoString;
    } else {
      dueDate = isoString;
    }
  } else if (targetHours !== undefined) {
    // e.g. "Remind me at 9 AM" without specific date -> today or tomorrow at 9 AM
    let candidate = setHours(setMinutes(setSeconds(now, 0), targetMinutes || 0), targetHours);
    if (candidate <= now) {
      candidate = addDays(candidate, 1);
    }
    const isoString = formatInTimeZone(candidate, safeTz, "yyyy-MM-dd'T'HH:mm:ssXXX");
    if (isExplicitReminder) {
      reminderTime = isoString;
    }
    dueDate = isoString;
  }

  // 9. Infer Category from words
  for (const [keyword, cat] of Object.entries(KNOWN_CATEGORIES)) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(raw)) {
      categoryName = cat;
      break;
    }
  }

  // 10. Clean Title
  // Strip "Remind me to " from start
  title = title.replace(/^remind(?:\s+me)?(?:\s+to)?\s+/i, '');
  // Strip leading "Fix the", "Buy ", "Pay my ", etc. if appropriate, or keep concise
  title = title.replace(/\s+/g, ' ').trim();

  // If title became empty, fallback to raw
  if (!title) {
    title = raw;
  }

  // Status inference
  let status: any = 'INBOX';
  if (dueDate) {
    status = 'SCHEDULED';
  } else if (priority === 'URGENT' || priority === 'HIGH') {
    status = 'NEXT';
  }

  return {
    title,
    categoryName,
    projectName,
    priority: priority || 'MEDIUM',
    dueDate,
    reminderTime,
    recurrenceRule,
    merchant,
    estimatedAmount,
    url,
    status,
  };
}
