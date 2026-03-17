import {
  generateReadingPlan,
  recalculatePlan,
  logReadingProgress,
  editBook
} from "../src/lib/readingPlan";
const baseBook = {
  id: "demo",
  title: "Industry Faithless",
  totalPages: 1e3,
  pagesRead: 0,
  startDate: /* @__PURE__ */ new Date("2026-03-01"),
  targetEndDate: /* @__PURE__ */ new Date("2026-05-28"),
  readingDaysPerWeek: 6,
  readingSpeed: "moderate",
  status: "active",
  dailyPlan: [],
  lastRecalculatedAt: /* @__PURE__ */ new Date("2026-03-01")
};
const plan = generateReadingPlan(baseBook, /* @__PURE__ */ new Date("2026-03-16"));
console.log("Initial plan days:", plan.length);
console.log("First target:", plan[0]);
console.log("Last target:", plan[plan.length - 1]);
const bookWithPlan = { ...baseBook, dailyPlan: plan };
const progressLogged = logReadingProgress(bookWithPlan, 30, /* @__PURE__ */ new Date("2026-03-17"));
console.log("Pages read after log:", progressLogged.pagesRead);
console.log("Status after log:", progressLogged.status);
const recalculated = recalculatePlan(progressLogged, /* @__PURE__ */ new Date("2026-03-20"));
console.log("Recalculated plan entries:", recalculated.length);
const reopened = editBook(
  { ...progressLogged, status: "completed", pagesRead: 1e3 },
  { pagesRead: 800, targetEndDate: /* @__PURE__ */ new Date("2026-06-01") },
  /* @__PURE__ */ new Date("2026-03-25")
);
console.log("Edited book status:", reopened.status);
console.log("Edited plan entries:", reopened.dailyPlan.length);
