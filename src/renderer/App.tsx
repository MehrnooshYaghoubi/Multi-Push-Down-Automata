import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import TitleBar from './components/TitleBar';
import Home from './pages/Home';
import Variables from './pages/Variables';
import Execution from './pages/Execution';
import './lib/particle';
import './styles/App.css';

export default function App() {
  return (
    <Router>
      <TitleBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/setVar" element={<Variables />} />
        <Route path="/exec" element={<Execution />} />
      </Routes>
    </Router>
  );
}
