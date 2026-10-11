import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Quiz from "./pages/Quiz";
import Test from "./pages/Test";
import MatchChaos from "./pages/MatchChaos";
import TypeRace from "./pages/TypeRace";
import TagSort from "./pages/TagSort";

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <main className="w-full max-w-5xl mx-auto px-4 py-6 sm:px-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/test" element={<Test />} />
          <Route path="/tag-sort" element={<TagSort />} />
          <Route path="/match-chaos" element={<MatchChaos />} />
          <Route path="/type-race" element={<TypeRace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
