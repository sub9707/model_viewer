import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ModelListPage from './pages/ModelListPage';
import ModelViewerPage from './pages/ModelViewerPage';
import './styles/App.css';

const App: React.FC = () => {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<ModelListPage />} />
          <Route path="/model/:id" element={<ModelViewerPage />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;