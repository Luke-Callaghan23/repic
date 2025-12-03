import { useEffect, useRef, useState } from 'react'
import type { ListedFile } from './App';
import { useNavigate } from 'react-router-dom';
import type { ScrollerNavigateState, ScrollerProps } from './Scroller';


export function FileSelector () {
    const navigate = useNavigate();
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

            const sorted = fileList.sort((a, b) => {
                try {

                    const [ prefA, remA ]  = a.file.name.split('_');
                    const [ prefB, remB ]  = b.file.name.split('_');
                    if (prefA !== prefB) {
                        return a.file.name.localeCompare(b.file.name);
                    }

                    const idxA = parseInt(remA.split('.')[0]);
                    const idxB = parseInt(remB.split('.')[0]);
                    if (idxA !== idxB) {
                        return idxA - idxB;
                    }
                    else {
                        return a.file.name.localeCompare(b.file.name);
                    }
                }
                catch (err: any) {
                    return a.file.name.localeCompare(b.file.name);
                }
            });

            return sorted;
        });
    }

    const submit = () => {
        setDisplayingFiles(fileList);
    }

    useEffect(() => {
        if (!displayingFiles) return;

        console.log({displayingFiles})

        const files: ScrollerNavigateState = {
            files: displayingFiles
        }
        navigate('/carousel', {
            state: files
        });
    }, [ displayingFiles ]);



    const inputRef = useRef<HTMLInputElement>(null);
    
    const [ selectedFiles, setSelectedFiles ] = useState<File[] | null>(null);

    useEffect(() => {
        if (inputRef.current && fileList) {
            const dataTransfer = new DataTransfer();
            fileList.forEach((file) => dataTransfer.items.add(file.file));
            inputRef.current.files = dataTransfer.files;
        }
    }, [fileList]);

    const recieveFileList = (fileList: FileList) => {
        const nextFileList = [];
        for (let idx = 0; idx < fileList.length; idx++) {
            const file = fileList.item(idx);
            if (!file) continue;
            nextFileList.push(file);
        }
        setSelectedFiles(nextFileList);
    };

    useEffect(() => {
        console.log(fileList)
    }, [ fileList ]);

    const replaceFiles = () => {
        selectedFiles && updateFilesInList([...selectedFiles]);
    };

    const addFiles = () => {
        selectedFiles && updateFilesInList(prevFileList => {
            if (!prevFileList) {
                return [ ...selectedFiles ];
            }
            return [
                ...prevFileList,
                ...selectedFiles
            ];
        })
    };


    return (<div className="form-container">
        <div>
            <label htmlFor="fileUpload">Choose files:&nbsp;&nbsp;&nbsp;</label>
            <input 
                type="file" 
                accept='image/*,video/*,text/html'
                id="fileUpload" 
                name="files[]" 
                multiple
                ref={inputRef}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    e.target.files && recieveFileList(e.target.files);
                }}
            ></input>

            <div className="button-container">
                <button onClick={replaceFiles} disabled={selectedFiles === null}>Replace Files</button>
                &nbsp;&nbsp;&nbsp;
                <button onClick={addFiles}  disabled={selectedFiles === null}>Add Files</button>
            </div>

            <div className="button-container">
                <button onClick={submit} disabled={fileList === null || fileList.length === 0}>View</button>
            </div>

            {
                fileList && 
                <div style={{ marginTop: 60 }}>
                    <section className="accordion">
                        <input type="checkbox" name="collapse2" id="handle3" />
                        <h2 className="handle">
                            <label htmlFor="handle3">Files</label>
                        </h2>
                        <div className="content">
                            <ul>
                                {fileList.map(file => {
                                    return <li key={Math.random()} style={{ color: file.data.loaded ? 'blue' : '' }}>{file.file.name}</li>
                                })}
                            </ul>
                        </div>
                    </section>
                </div>
            }
        </div>
    </div>);
};