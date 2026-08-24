# Online University Mobile Design Plan

## Product Direction

Online University is a **mobile-first academic learning environment** designed for focused, one-handed study in portrait orientation. The interface uses a calm, high-trust visual language inspired by institutional learning materials rather than consumer social apps. The core student journey is deliberately simple: discover a course, enroll, continue lessons, practice knowledge, complete a final assessment, and view a verified certificate. An administrator mode provides course lifecycle controls without exposing authoring tools to students.

## Screen List

| Screen | Primary content and functionality |
|---|---|
| Welcome / role entry | Introduces Online University and lets the prototype switch between student and administrator modes. A production integration will replace this with authenticated role resolution. |
| Home | Shows a continuation card for the most recent course, learning progress, upcoming assessment, concise statistics, and a personalized course recommendation. |
| Discover | Provides course search, category chips, filter controls, and a scrollable course catalogue with level, duration, rating, and certificate eligibility. |
| Course detail | Shows course artwork, title, instructor, learning outcomes, prerequisites, course structure, ratings, and a primary enrollment or continuation action. |
| Learning player | Places lesson content first, including video-style content, article reading, a progress indicator, previous/next lesson controls, and an expandable module navigator. |
| Practice | Supports flashcard review and short quiz questions. Completion updates the relevant module progress in local data. |
| Results / certificate | Displays assessment completion, score, earned status, certificate identifier, and a downloadable-style certificate card. |
| My learning | Lists enrolled and completed courses, completion percentages, certificates, and persistent learning statistics. |
| Profile | Provides the learner identity, academic profile summary, settings entry points, and a sign-out affordance for the future authenticated product. |
| Admin dashboard | Summarizes learners, enrollments, courses, certificate issuance, revenue, and recent operational activity. |
| Course builder | Lists managed courses and supports an editable course lifecycle from draft through review, published, and archived. |
| Course editor | Captures course metadata, outcomes, requirements, publishing status, and an ordered module outline. |
| Module editor | Provides module title/description and a reorderable-style content list for articles, videos, flashcards, quizzes, tests, and final exam configuration. |
| Certificate verification | Provides a public-style search pattern for a certificate ID and returns the certificate holder, course, date, final score, and validity indicator. |

## Key User Flows

| Flow | Steps |
|---|---|
| Course discovery to enrollment | Student opens **Discover** → searches or selects a category → opens a course → reviews outcomes and curriculum → taps **Enroll now** → course is added to **My learning** and becomes the continuation card on Home. |
| Continue learning | Student opens **Home** → taps **Continue learning** → learning player opens at current lesson → marks the lesson complete → progress updates → taps **Next lesson** or opens the lesson navigator. |
| Practice and completion | Student opens a practice item from the player → flips flashcards or selects quiz answers → receives immediate feedback → completes module → unlocks subsequent content and eventually the final assessment. |
| Earn certificate | Student completes all lessons → passes the final examination → opens Results → receives a certificate card containing certificate ID, course, completion date, score, and verification status. |
| Admin publishing workflow | Administrator opens Admin dashboard → selects Course Builder → opens a course editor → creates/edits modules and learning content → moves the course from **Draft** to **Review** → publishes only after review. |

## Navigation and Interaction Design

The student experience uses a five-item bottom bar: **Home, Discover, My Learning, Certificates, Profile**. The center of each screen is kept within reach, while high-priority primary actions live in the lower half of the viewport or within a bottom-aligned action area. Course lists use a single-column card rhythm with 44-point minimum touch targets. The learning player keeps content visually dominant; the course navigator is contextual and collapsible rather than permanently taking screen space.

Administrator tools remain intentionally separate from the student tab shell. An administrator enters a focused dashboard with a course management list and an editor flow, reducing the risk of student-facing screens being cluttered by configuration controls.

## Visual System

| Token | Value | Use |
|---|---:|---|
| University navy | `#102A43` | Primary headers, navigation, trusted academic foundation. |
| Oxford blue | `#0B1F33` | Deep contrast for dark surfaces and status bar treatment. |
| Scholar gold | `#D6A84B` | Achievement markers, certification highlights, and premium accents. |
| Paper | `#F8F6F1` | Warm page background that reduces sterile all-white fatigue. |
| White | `#FFFFFF` | Cards, sheets, and focused content areas. |
| Slate | `#627D98` | Supporting labels and secondary information. |
| Success green | `#228B5A` | Completion, passing scores, and verified certificates. |

Typography should favor a high-legibility sans-serif system face with clear hierarchy: concise navigation labels, 28–32 point page titles, 18–20 point card titles, and 15–16 point body text. Rounded cards are restrained, using 16-point corner radii, hairline borders, and low-elevation shadows. Gold appears only as a meaningful achievement accent, never as a large decorative field.

## Domain Model for the Prototype

| Entity | Essential fields | Relationships |
|---|---|---|
| Course | id, title, description, category, level, duration, instructor, status, outcomes, requirements, certificateEligible | Contains ordered modules; is enrolled by learners; may belong to a program. |
| Module | id, courseId, title, description, position | Contains ordered learning items and assessments. |
| Learning item | id, moduleId, type, title, duration, content, completion state | Supports video, article, flashcard set, quiz, test, and exam types. |
| Enrollment | courseId, learnerId, enrolledAt, progressPercent, completedAt | Tracks access and aggregate progress. |
| Attempt | itemId, learnerId, score, passed, submittedAt | Records quiz, test, and final examination outcomes. |
| Certificate | id, learnerId, courseId, issuedAt, finalScore, verificationStatus | Is created after eligible completion and can be verified by its identifier. |
| Program | id, title, type, partnerInstitution, courseIds | Represents certificate through master's pathways without making unsupported accreditation claims. |

## Delivery Scope

The initial build will implement a polished, interactive front-end prototype with **local state persistence** and credible seeded academic content. It will demonstrate the role-based navigation, course discovery, enrollment, lesson completion, assessment feedback, certificate issuance, certificate verification, and administrator publishing interface. Secure account registration, Google sign-in, remote payment processing, rich media uploading, database synchronization, and live public verification require a backend integration and will remain clear extension points rather than simulated as production claims.
