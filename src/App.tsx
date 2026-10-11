import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";

import RequireAuth from "./components/RequireAuth";
import AuthProvider from "./context/AuthProvider";

import Home from "./pages/Home";
import Quiz from "./pages/Quiz";
import Test from "./pages/Test";
import MatchChaos from "./pages/MatchChaos";
import TypeRace from "./pages/TypeRace";
import TagSort from "./pages/TagSort";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* PUBLICZNE */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* TYLKO DLA ZALOGOWANYCH */}
          <Route element={<RequireAuth />}>
            <Route path="/" element={<Home />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/test" element={<Test />} />
            <Route path="/tag-sort" element={<TagSort />} />
            <Route path="/match-chaos" element={<MatchChaos />} />
            <Route path="/type-race" element={<TypeRace />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
