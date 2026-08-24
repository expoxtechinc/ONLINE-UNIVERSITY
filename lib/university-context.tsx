import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";

import { calculateNextProgress, certificateId, type Certificate, type CourseStatus } from "@/lib/university";

type UniversityState = {
  enrolledIds: string[];
  progress: Record<string, number>;
  certificates: Certificate[];
  statuses: Record<string, CourseStatus>;
};

type UniversityContextValue = UniversityState & {
  isReady: boolean;
  enroll: (courseId: string) => void;
  completeLesson: (courseId: string) => void;
  setProgress: (courseId: string, value: number) => void;
  awardCertificate: (courseId: string, finalScore: number) => Certificate;
  setCourseStatus: (courseId: string, status: CourseStatus) => void;
};

const STORAGE_KEY = "online-university-state-v1";
const initialState: UniversityState = {
  enrolledIds: ["data-literacy"],
  progress: { "data-literacy": 68 },
  certificates: [
    {
      id: "OU-DIG-2026-01482",
      courseId: "data-literacy",
      learnerName: "Jordan Taylor",
      finalScore: 92,
      issuedAt: "12 August 2026",
    },
  ],
  statuses: { "data-literacy": "Published", "leadership-essentials": "Published", "climate-solutions": "Published", "health-communication": "Review" },
};

const UniversityContext = createContext<UniversityContextValue | null>(null);

export function UniversityProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<UniversityState>(initialState);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) setState(JSON.parse(stored) as UniversityState);
      })
      .catch(() => undefined)
      .finally(() => setIsReady(true));
  }, []);

  useEffect(() => {
    if (isReady) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [isReady, state]);

  const value = useMemo<UniversityContextValue>(
    () => ({
      ...state,
      isReady,
      enroll: (courseId) => {
        setState((current) => ({
          ...current,
          enrolledIds: current.enrolledIds.includes(courseId) ? current.enrolledIds : [...current.enrolledIds, courseId],
          progress: { ...current.progress, [courseId]: current.progress[courseId] ?? 0 },
        }));
      },
      completeLesson: (courseId) => {
        setState((current) => ({ ...current, progress: { ...current.progress, [courseId]: calculateNextProgress(current.progress[courseId] ?? 0) } }));
      },
      setProgress: (courseId, value) => {
        setState((current) => ({ ...current, progress: { ...current.progress, [courseId]: Math.min(100, Math.max(0, value)) } }));
      },
      awardCertificate: (courseId, finalScore) => {
        const certificate: Certificate = { id: certificateId(courseId), courseId, learnerName: "Jordan Taylor", finalScore, issuedAt: "24 August 2026" };
        setState((current) => ({
          ...current,
          progress: { ...current.progress, [courseId]: 100 },
          certificates: current.certificates.some((item) => item.courseId === courseId) ? current.certificates : [...current.certificates, certificate],
        }));
        return certificate;
      },
      setCourseStatus: (courseId, status) => setState((current) => ({ ...current, statuses: { ...current.statuses, [courseId]: status } })),
    }),
    [isReady, state],
  );

  return <UniversityContext.Provider value={value}>{children}</UniversityContext.Provider>;
}

export function useUniversity() {
  const value = useContext(UniversityContext);
  if (!value) throw new Error("useUniversity must be used inside UniversityProvider");
  return value;
}
