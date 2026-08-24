export type CourseStatus = "Draft" | "Review" | "Published" | "Archived";
export type CourseLevel = "Beginner" | "Intermediate" | "Advanced";

export type Lesson = {
  id: string;
  title: string;
  type: "Video" | "Article" | "Flashcards" | "Quiz" | "Test" | "Final exam";
  duration: string;
  description: string;
};

export type Module = {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
};

export type Course = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  category: string;
  level: CourseLevel;
  duration: string;
  instructor: string;
  enrolledCount: string;
  rating: string;
  color: string;
  accent: string;
  certificateEligible: boolean;
  status: CourseStatus;
  outcomes: string[];
  requirements: string[];
  modules: Module[];
};

export type Certificate = {
  id: string;
  courseId: string;
  learnerName: string;
  finalScore: number;
  issuedAt: string;
};

export const universityCourses: Course[] = [
  {
    id: "data-literacy",
    title: "Foundations of Data Literacy",
    shortTitle: "Data Literacy",
    description:
      "Build a practical foundation for interpreting data, evaluating evidence, and communicating clear insights in professional decisions.",
    category: "Data & Technology",
    level: "Beginner",
    duration: "7h 40m",
    instructor: "Dr. Maya Bennett",
    enrolledCount: "14.2k",
    rating: "4.8",
    color: "#183B65",
    accent: "#D6A84B",
    certificateEligible: true,
    status: "Published",
    outcomes: [
      "Interpret charts, distributions, and common data claims.",
      "Distinguish correlation from causation in everyday decisions.",
      "Communicate an evidence-based recommendation with confidence.",
    ],
    requirements: ["No prior statistics study is required.", "A notebook is recommended for practice exercises."],
    modules: [
      {
        id: "dl-m1",
        title: "Reading data with confidence",
        description: "Essential structures, terms, and visual patterns.",
        lessons: [
          { id: "dl-1", title: "Welcome to data literacy", type: "Video", duration: "08:12", description: "A concise orientation to the course and its assessment plan." },
          { id: "dl-2", title: "From numbers to evidence", type: "Article", duration: "06 min", description: "Learn how credible evidence is formed and evaluated." },
          { id: "dl-3", title: "Core vocabulary review", type: "Flashcards", duration: "10 cards", description: "Practice the language used throughout the course." },
        ],
      },
      {
        id: "dl-m2",
        title: "Finding meaningful patterns",
        description: "Work through visual data and decision-making examples.",
        lessons: [
          { id: "dl-4", title: "Patterns, trends, and outliers", type: "Video", duration: "12:40", description: "Recognize useful patterns without overstating certainty." },
          { id: "dl-5", title: "Practice: choose the strongest claim", type: "Quiz", duration: "8 min", description: "Use a short graded quiz to test your interpretation skills." },
        ],
      },
      {
        id: "dl-m3",
        title: "Communicating insight",
        description: "Turn sound analysis into concise and ethical communication.",
        lessons: [
          { id: "dl-6", title: "Write a decision-ready insight", type: "Article", duration: "09 min", description: "A practical framework for clear, audience-specific messages." },
          { id: "dl-7", title: "Final examination", type: "Final exam", duration: "30 min", description: "Demonstrate your mastery to earn a verified course certificate." },
        ],
      },
    ],
  },
  {
    id: "leadership-essentials",
    title: "Leadership Essentials",
    shortTitle: "Leadership Essentials",
    description:
      "Develop grounded leadership habits for guiding teams through decisions, feedback, and change.",
    category: "Business",
    level: "Intermediate",
    duration: "5h 20m",
    instructor: "Prof. Elena Ortiz",
    enrolledCount: "8.6k",
    rating: "4.7",
    color: "#4A3157",
    accent: "#E4B363",
    certificateEligible: true,
    status: "Published",
    outcomes: ["Create shared clarity around goals.", "Practice constructive feedback conversations.", "Adapt your leadership approach to the situation."],
    requirements: ["Experience working in a team is helpful but not required."],
    modules: [
      { id: "le-m1", title: "Lead with clarity", description: "Establish a practical leadership foundation.", lessons: [{ id: "le-1", title: "The everyday work of leadership", type: "Video", duration: "11:24", description: "A grounded view of leadership behaviours." }, { id: "le-2", title: "Reflection: your leadership context", type: "Article", duration: "07 min", description: "Map the conditions in which you lead." }] },
      { id: "le-m2", title: "Conversations that move work forward", description: "Build trust through communication and feedback.", lessons: [{ id: "le-3", title: "Feedback in action", type: "Video", duration: "14:10", description: "Prepare and deliver useful feedback." }, { id: "le-4", title: "Leadership review", type: "Quiz", duration: "10 min", description: "Test your knowledge with practical scenarios." }] },
    ],
  },
  {
    id: "climate-solutions",
    title: "Climate Solutions in Practice",
    shortTitle: "Climate Solutions",
    description:
      "Explore the systems, technologies, and civic choices that shape resilient, lower-carbon communities.",
    category: "Sustainability",
    level: "Beginner",
    duration: "4h 10m",
    instructor: "Dr. Nia Okafor",
    enrolledCount: "6.9k",
    rating: "4.9",
    color: "#1D5B4B",
    accent: "#D9B44A",
    certificateEligible: true,
    status: "Published",
    outcomes: ["Explain the basics of climate mitigation and adaptation.", "Compare solutions through systems thinking.", "Identify realistic action within a local context."],
    requirements: ["Curiosity and an interest in applied sustainability."],
    modules: [
      { id: "cs-m1", title: "The systems view", description: "Understand the connected systems that shape emissions.", lessons: [{ id: "cs-1", title: "A practical climate systems map", type: "Video", duration: "09:10", description: "Orient yourself to sources, impacts, and intervention points." }, { id: "cs-2", title: "Quick study cards", type: "Flashcards", duration: "12 cards", description: "Review foundational terms and relationships." }] },
      { id: "cs-m2", title: "Solutions close to home", description: "Evaluate action across energy, mobility, and communities.", lessons: [{ id: "cs-3", title: "Community solution patterns", type: "Article", duration: "10 min", description: "Look at realistic examples of local action." }, { id: "cs-4", title: "Practice test", type: "Test", duration: "12 min", description: "A short automatic assessment." }] },
    ],
  },
  {
    id: "health-communication",
    title: "Health Communication Fundamentals",
    shortTitle: "Health Communication",
    description: "Learn to communicate health information in a clear, respectful, and accessible way.",
    category: "Health & Wellbeing",
    level: "Beginner",
    duration: "3h 50m",
    instructor: "Amelia Rowe, MPH",
    enrolledCount: "3.4k",
    rating: "4.6",
    color: "#275D72",
    accent: "#D6A84B",
    certificateEligible: true,
    status: "Review",
    outcomes: ["Use plain language in health information.", "Recognise accessibility needs in public communication."],
    requirements: ["No previous experience is required."],
    modules: [{ id: "hc-m1", title: "Clear communication", description: "Core techniques for thoughtful public information.", lessons: [{ id: "hc-1", title: "Begin with the audience", type: "Video", duration: "10:00", description: "Match the message to the people who need it." }] }],
  },
];

export const categories = ["All subjects", "Data & Technology", "Business", "Sustainability", "Health & Wellbeing"];

export function getCourse(courseId: string | string[] | undefined) {
  const id = Array.isArray(courseId) ? courseId[0] : courseId;
  return universityCourses.find((course) => course.id === id) ?? universityCourses[0];
}

export function calculateNextProgress(currentProgress: number, increment = 16) {
  return Math.min(100, Math.max(0, currentProgress + increment));
}

export function canIssueCertificate(progress: number, finalScore: number) {
  return progress >= 100 && finalScore >= 70;
}

export function certificateId(courseId: string) {
  return `OU-${courseId.slice(0, 3).toUpperCase()}-2026-0482`;
}
