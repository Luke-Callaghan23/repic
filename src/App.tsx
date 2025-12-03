import './style/index.css';
import './style/App.css';

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Scroller } from './Scroller';
import { FileSelector } from './FileSelector';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

export type DataURL = string;
export type ListedFile = { 
    file: File,
    data: {
        loaded: false,
    } | {
        loaded: true,
        data: DataURL,
    }
};

function App() {
    return <Router>
        <Routes>
            <Route path="/" element={<FileSelector />} />
            <Route path="/carousel" element={<Scroller />} />
        </Routes>
    </Router>
}

createRoot(document.getElementById('root')!).render(
    <App />
);
