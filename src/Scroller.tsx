import { useEffect, useRef } from 'react'
import { useState } from 'react'
import PWABadge from './PWABadge.tsx'

// import {image} from './content/image.tsx';
// import {image2} from './content/image2.tsx';
// import {image3} from './content/image3.tsx';
// import {video} from './content/video.tsx';
// import {video2} from './content/video2.tsx';
// import {video3} from './content/video3.tsx';
import { Displayable } from './components/Displayable.tsx'
import { useLocation } from 'react-router-dom';
import type { DataURL, ListedFile } from './App.tsx';

export type Pos = [ number, number ];
export type MovementWindow = [Pos, Pos, Pos, Pos, Pos, Pos];

const initalMovementWindow: MovementWindow = [
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
];

export interface ScrollerNavigateState {
    files: ListedFile[] | null,
}

const ALLOCATE_COUNT = 10;

export interface ScrollerProps {
    memory: number | null;
}

function b64toBlob(b64Data: string, contentType: string, sliceSize = 512) {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);

        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }

    const blob = new Blob(byteArrays, { type: contentType });
    return URL.createObjectURL(blob);
}


export function Scroller({ memory }: ScrollerProps) {
    const [ displayables, setDisplayables ] = useState<ListedFile[] | null>();

    const downPosition = useRef<Pos>(null);
    const [ offset, setOffset ] = useState<Pos | null>(null);
    const [ latestPosition, setLatestPosition ] = useState<Pos | null>(null);

    const [ displayableIndex, setDisplayableIndex ] = useState<number>(0);
    const moveDisplayableIndex = (direction: -1 | 1 | 0) => {
        if (!displayables) return;
        reset();
        setDisplayableIndex(currentIdx => {

            let nextIdx = (currentIdx + direction);
            if (nextIdx < 0) {
                nextIdx = displayables.length - 1;
            }
            else if (nextIdx === displayables.length) {
                nextIdx = 0;
            }

            allocateFiles(nextIdx);
            return nextIdx;
        });
    };

    const reset = () => {
        downPosition.current = null;
        setOffset(null);
        setLatestPosition(null);
        setMovementWindow(initalMovementWindow);
    }

    const containerRef = useRef<HTMLDivElement>(null);
    const [ movementWindow, setMovementWindow ] = useState<MovementWindow>(initalMovementWindow);

    // NOTE: it is assumed that all files that are NOT the files provided to this function should be
    //      deallocated
    const allocateFiles = (currentIdx: number) => {
        if (!displayables) return;

        // Get a wrap-around slice of the displayables, centered around currentIdx
        //      with a total count of ALLOCATE_COUNT
        let start = currentIdx - (Math.floor(ALLOCATE_COUNT / 2));
        let end = currentIdx + (Math.ceil(ALLOCATE_COUNT / 2) - 1)
        if (start < 0) {
            start = displayables.length + start;
        }
        
        if (end >= displayables.length) {
            end = end - displayables.length;
        }
        
        let slice: ListedFile[];;
        if (start > end) {
            const sliceA = displayables.slice(start, displayables.length);
            const sliceB = displayables.slice(0, end+1);
            slice = [
                ...sliceA,
                ...sliceB
            ]
        }
        else {
            slice = displayables.slice(start, end+1);
        }

        const toAllocate: ListedFile[] = slice;


        // Deallocate all other files that are not a part of this list
        // Updates array is really just a clone of the normal displayables array
        const updates = [ ...displayables ];
        
        // Store the indeces to update
        let updatedDisplayablesIndeces: number[] = [];

        // Iterate over all displayables and search for any that are allocated 
        //      but are not a part of the toAllocate array
        for (let fileIndex = 0; fileIndex < updates.length; fileIndex++) {
            const file = updates[fileIndex];
            if (!file.data.loaded) continue;

            let keepAllocated = false;
            for (const allocateMe of toAllocate) {
                if (file.file === allocateMe.file) {
                    keepAllocated = true;
                }
            }
            if (keepAllocated) continue;

            console.log("DEALLOCATING: " + file.file.name);

            // Revoke the url and set the data to unloaded
            URL.revokeObjectURL(file.data.data);
            if (file.data.posterUrl) {
                URL.revokeObjectURL(file.data.posterUrl);
            }
            file.data = { loaded: false };
            updatedDisplayablesIndeces.push(fileIndex);
        }
        
        // Update displayables state
        if (updatedDisplayablesIndeces.length > 0) {
            setDisplayables(prevDisplayables => {
                if (!prevDisplayables) return null;

                for (let pfIdx = 0; pfIdx < prevDisplayables.length; pfIdx++) {
                    if (updatedDisplayablesIndeces.find(updated => updated === pfIdx)) {
                        prevDisplayables[pfIdx] = updates[pfIdx];
                    }
                }
                return [ ...prevDisplayables ];
            })
        }

        // Allocate all the unallocated files from toAllocate
        for (const file of toAllocate) {
            // Do nothing if the file is already allocated
            if (file.data.loaded) {
                continue;
            }

            console.log("ALLOCATING: " + file.file.name);

            const reader = new FileReader();
            reader.readAsArrayBuffer(file.file);
            reader.onloadend = ev => {
                const arrayBuffer = ev!.target!.result as ArrayBuffer;

                // Once the reader returns data, search for this file in the files
                //      state and update it
                setDisplayables(prevList => {

                    if (!prevList) return null;
                    return prevList.map(prev => {
                        //
                        if (prev.file === file.file) {

                            let dataUrl: DataURL;
                            let posterUrl: DataURL | undefined;
                            
                            // If the document is .html, try to parse a video and poster image
                            //      from the html contents
                            if (file.file.name.endsWith('.html')) {
                                try {
                                    const decoder = new TextDecoder('utf-8');
                                    const html = decoder.decode(arrayBuffer);

                                    // Attempt to parse the mime and base64 data from the html
                                    const mimeDataSplit = html.split('src="data:')[1].split(',');
                                    let [ mime, mp4AndEtc ] = mimeDataSplit;

                                    // If the mime doesn't seem right, use a default
                                    if (!mime.startsWith('video')) {
                                        mime = "video/mp4";
                                    }
                                    
                                    // Create a blob from the mp4 data
                                    const mp4 = mp4AndEtc.split('"')[0];
                                    const mp4Url = b64toBlob(mp4, mime);
                                    dataUrl = mp4Url;
                                    
                                    try {

                                        // Similar as above, but for the poster
                                        // The poster is pretty much optional, so it doesn't really matter
                                        //      if we are unable to parse it from the html
                                        const posterMimeDataSplit = html.split('poster="data:')[1].split(',');
                                        let [ posterMime, posterAndEtc ] = posterMimeDataSplit;
                                        if (!posterMime.startsWith("image")) {
                                            posterMime = "image/png";
                                        }

                                        const posterImage = posterAndEtc.split('"')[0];
                                        const posterImageUrl = b64toBlob(posterImage, "image/png");
                                        posterUrl = posterImageUrl;
                                    }
                                    // Can just ignore it if the poster image parsing failed
                                    catch (err: any) {}
                                }
                                catch (err: any) {
                                    return prev;
                                }
                            }
                            else {
                                // For most file types, just read the data and create a Blob
                                const buffer = new Uint8Array(arrayBuffer!);
                                const blob = new Blob([buffer], { type: file.file.type });
                                dataUrl = URL.createObjectURL(blob);
                            }
                            
                            if (prev.data.loaded) {
                                // If the previous is somehow loaded already,
                                //      revoke this data url and return
                                URL.revokeObjectURL(dataUrl);
                                if (posterUrl) URL.revokeObjectURL(posterUrl);
                                return prev;
                            }


                            return {
                                file: prev.file,
                                data: {
                                    loaded: true,
                                    data: dataUrl,
                                    posterUrl: posterUrl,
                                }
                            }
                        }
                        return prev;
                    });

                });
            }
        }
    };

    const firstRef = useRef<boolean>(true);
    useEffect(() => {
        if (!displayables) return;
        if (!firstRef.current) return;
        firstRef.current = false;
        allocateFiles(displayableIndex);
    }, [ displayables ]);

    const location = useLocation();
    const { files } = (location.state || {}) as ScrollerNavigateState;
    if (!files && !displayables) {
        return <>
            <h2>No files retrieved.  please return to file select.</h2>
            <button onClick={() => window.location.href = '/'}>Return</button>
        </>
    }
    else if (files) {
        location.state = {};
        setDisplayables(files);
    }

    const onMouseDown = (pageX: number, pageY: number) => {
        downPosition.current = [
            pageX,
            pageY
        ];
        setLatestPosition([ pageX, pageY ]);
    };
    const onMouseMove = (pageX: number, pageY: number) => {
        if (downPosition.current) {
            const [ initialX, initialY ] = downPosition.current;
            
            const movementX = pageX - latestPosition?.[0]!;
            const movementY = pageY - latestPosition?.[1]!;

            setMovementWindow(prevWindow => {
                prevWindow.shift();
                prevWindow.push([ movementX, movementY ]);
                return [ ...prevWindow ]
            });

            setOffset([
                (initialX - pageX) * -1,
                (initialY - pageY) * -1
            ]);
            setLatestPosition([
                pageX,
                pageY
            ]);
        }
    };
    const onMouseUp = () => {
        if (!containerRef.current) {
            return reset();
        }

        const [ accX, accY ]: Pos = movementWindow.reduce(([ aX, aY ], [ cX, cY ]) => {
            return [ aX + cX, aY + cY ];
        }, [ 0, 0 ]);

        const threshWidth = containerRef.current.clientWidth / 10;
        const threshHeight = containerRef.current.clientHeight / 5;

        if (Math.abs(accY) >= threshHeight) {
            if (accY < 0) {
                console.log("GO OFF TOP");
                window.location.href = '/';
                return;
            }
            else {
                console.log("GO OFF BOTTOM");
                window.location.href = '/';
                return;
            }
        }
        else if (Math.abs(accX) >= threshWidth) {
            if (accX < 0) {
                console.log("GO OFF LEFT");
                moveDisplayableIndex(1);
            }
            else {
                console.log("GO OFF RIGHT");
                moveDisplayableIndex(-1);
            }
        }

        reset();
    };
    const onMouseLeave = (clientX: number, clientY: number) => {
        if (!offset) return;
        if (!containerRef.current) return;

        if (clientX < 0.05) {
            console.log("WENT OFF LEFT");
            moveDisplayableIndex(1);
        }
        else if (clientY < 0.05) {
            console.log("WENT OFF TOP");
            window.location.href = '/';
        }
        else if (clientX / containerRef.current.clientWidth >= 0.95) {
            console.log("WENT OFF RIGHT");
            moveDisplayableIndex(-1);
        }
        else if (clientY / containerRef.current.clientHeight >= 0.95) {
            console.log("WENT OFF BOTTOM");
            window.location.href = '/';
        }
    };


    return (
        <>
            <PWABadge />
            <div 
                id="video-container" 
                className="video-container"
                onMouseDown={ev => onMouseDown(ev.pageX, ev.pageY)}
                onMouseMove={ev => onMouseMove(ev.pageX, ev.pageY)}
                onMouseUp={onMouseUp}
                onMouseLeave={ev => onMouseLeave(ev.clientX, ev.clientY)}

                onTouchStart={ev => {
                    const touch = ev.nativeEvent.touches[0];
                    return onMouseDown(touch.pageX, touch.pageY);
                }}
                onTouchMove={ev => {
                    const touch = ev.nativeEvent.touches[0];
                    return onMouseMove(touch.pageX, touch.pageY);
                }}
                onTouchEnd={onMouseUp}


                ref={containerRef}
            >
                {displayables && <Displayable 
                    memory={memory}
                    file={displayables[displayableIndex]} 
                    offset={offset} 
                    idx={displayableIndex}
                    fullCount={displayables.length}
                />}
            </div>
        </>
    )
}



