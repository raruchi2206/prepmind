import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Navigation } from "./components/Navigation";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import Landing from "./pages/Landing";
import {
  Login,
  Signup,
  ForgotPassword,
  VerifyOTP,
  ResetPassword,
} from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Knowledge, { KnowledgeDetail } from "./pages/Knowledge";
import Create from "./pages/Create";
import Summary from "./pages/Summary";
import Notes from "./pages/Notes";
import Quiz from "./pages/Quiz";
import PracticePaper from "./pages/PracticePaper";
import Viva, { VivaTranscriptPage } from "./pages/Viva";
import Ask from "./pages/Ask";
import History from "./pages/History";
import Progress from "./pages/Progress";
import Profile from "./pages/Profile";

const APP_ROUTES = [
  "/dashboard",
  "/knowledge",
  "/create",
  "/summary",
  "/notes",
  "/quiz",
  "/practice-paper",
  "/viva",
  "/ask",
  "/history",
  "/progress",
  "/profile",
];

function AppShell({ theme, onThemeToggle, onSetTheme }) {
  const location = useLocation();
  const isFullscreen = ["/quiz", "/practice-paper", "/viva"].some((p) =>
    location.pathname.startsWith(p),
  );
  const isApp = APP_ROUTES.some((r) => location.pathname.startsWith(r));
  const showNav = isApp && !isFullscreen;

  return (
    <div className={theme === "light" ? "app-shell light" : "app-shell"}>
      {showNav && (
        <Navigation
          theme={theme}
          onThemeToggle={onThemeToggle}
          onSetTheme={onSetTheme}
        />
      )}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login theme={theme} />} />
        <Route path="/signup" element={<Signup theme={theme} />} />
        <Route path="/register" element={<Signup theme={theme} />} />
        <Route
          path="/forgot-password"
          element={<ForgotPassword theme={theme} />}
        />
        <Route path="/verify-otp" element={<VerifyOTP theme={theme} />} />
        <Route
          path="/reset-password"
          element={<ResetPassword theme={theme} />}
        />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard theme={theme} />} />
          <Route path="/knowledge" element={<Knowledge theme={theme} />} />
          <Route
            path="/knowledge/:id"
            element={<KnowledgeDetail theme={theme} />}
          />
          <Route path="/create" element={<Create theme={theme} />} />
          <Route path="/summary" element={<Summary theme={theme} />} />
          <Route path="/notes" element={<Notes theme={theme} />} />
          <Route path="/quiz" element={<Quiz theme={theme} />} />
          <Route
            path="/practice-paper"
            element={<PracticePaper theme={theme} />}
          />
          <Route path="/viva" element={<Viva theme={theme} />} />
          <Route
            path="/viva/transcript"
            element={<VivaTranscriptPage theme={theme} />}
          />
          <Route path="/ask" element={<Ask theme={theme} />} />
          <Route path="/history" element={<History theme={theme} />} />
          <Route path="/progress" element={<Progress theme={theme} />} />
          <Route
            path="/profile"
            element={
              <Profile
                theme={theme}
                onThemeToggle={onThemeToggle}
                onSetTheme={onSetTheme}
              />
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  const resolveSystemTheme = () =>
    window.matchMedia?.("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  const [theme, setTheme] = useState(() => {
    const storedMode = localStorage.getItem("pm-theme-mode");
    if (storedMode === "system") return resolveSystemTheme();
    return localStorage.getItem("pm-theme") || "dark";
  });

  const setThemeMode = (nextTheme) => {
    const normalized =
      nextTheme === "system" ? resolveSystemTheme() : nextTheme;
    localStorage.setItem("pm-theme-mode", nextTheme);
    localStorage.setItem("pm-theme", normalized);
    setTheme(normalized);
  };

  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      localStorage.setItem("pm-theme-mode", next);
      localStorage.setItem("pm-theme", next);
      return next;
    });
  };

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell
          theme={theme}
          onThemeToggle={toggleTheme}
          onSetTheme={setThemeMode}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
