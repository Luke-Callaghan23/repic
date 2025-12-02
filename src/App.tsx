import './style/index.css';
import './style/App.css';

import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Scroller } from './Scroller';
import { FileSelector } from './FileSelector';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';


export type ListedFile = { 
    file: File,
    data: {
        loaded: false,
    } | {
        loaded: true,
        data: Uint8Array<ArrayBuffer>,
    }
};

function App() {
    const [ fileList, setFileList ] = useState<ListedFile[] | null>(null);
    const [ displayingFiles, setDisplayingFiles ] = useState<ListedFile[] | null>(null);

    const updateFilesInList = (files: File[] | ((prevFiles: File[] | null) => File[])) => {
        setFileList(prevFiles => {
            if (typeof files === 'function') {
                const update = files(prevFiles ? prevFiles.map(({ file }) => file) : null);
                if (!update) return null;
                files = update;
            }

            const fileList: ListedFile[] = files.map(file => {
                return {
                    file: file,
                    data: { loaded: false },
                }
            });

            for (const file of fileList) {
                const reader = new FileReader();
                reader.readAsArrayBuffer(file.file);
                reader.onloadend = ev => {
                    const arrayBuffer = ev!.target!.result as ArrayBuffer;
                    setFileList(prevList => {
                        console.log({prevList});
                        if (!prevList) return null;
                        return prevList.map(prev => {
                            console.log(prev.file.name === file.file.name)
                            if (prev.file.name === file.file.name) {
                                return {
                                    file: prev.file,
                                    data: {
                                        loaded: true,
                                        data: new Uint8Array(arrayBuffer!)
                                    }
                                }
                            }
                            return prev;
                        });
                    });
                }
            }
            return fileList;
        });
    }

    const submit = () => {
        setDisplayingFiles(fileList);
    }

    useEffect(() => {
        if (!fileList) return;

        
    }, [ fileList ]);

    return <Router>
        <Routes>
            <Route path="/" element={<FileSelector fileList={fileList} updateFilesInList={updateFilesInList} submit={submit} />} />
            <Route path="/carousel" element={<Scroller />} />
        </Routes>
    </Router>
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
