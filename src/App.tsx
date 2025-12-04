import './style/index.css';
import './style/App.css';

import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Scroller } from './pages/scroller/Scroller';
import { FileSelector } from './pages/fileSelector/FileSelector';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

export type DataURL = string;
export type ListedFile = { 
    file: File,
    data: {
        loaded: false,
    } | {
        loaded: true,
        data: DataURL,
        posterUrl?: DataURL
    }
};

function App() {

    const [ memoryInfo, setMemoryInfo ] = useState<number | null>(null);

    useEffect(() => {
        const updateMemory = () => {
            // @ts-ignore
            if (window.performance && window.performance.memory && window.performance.memory.totalJSHeapSize) {
                //@ts-ignore
                setMemoryInfo(window.performance.memory.totalJSHeapSize);
            }
        };

        //@ts-ignore
        if (window.performance && window.performance.memory && window.performance.memory.totalJSHeapSize) {
            const intervalId = setInterval(updateMemory, 1000); // Update every second
            updateMemory(); // Initial update
            return () => clearInterval(intervalId);
        }
    }, []);

    return <Router>
        <Routes>
            <Route path="/" element={<FileSelector />} />
            <Route path="/carousel" element={<Scroller memory={memoryInfo} />} />
        </Routes>
    </Router>
}

createRoot(document.getElementById('root')!).render(
    <App />
);
