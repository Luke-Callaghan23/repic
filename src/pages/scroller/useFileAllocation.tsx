import { useEffect, useRef } from "react";
import type { DataURL, ListedFile } from "../../App";
import { useLocation } from "react-router-dom";
import type { ScrollerNavigateState } from "./Scroller";

const ALLOCATE_COUNT = 10;

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



export function useFileAllocations (
    displayableIndex: number,
    displayables: ListedFile[] | null | undefined,
    setDisplayables: React.Dispatch<React.SetStateAction<ListedFile[] | null | undefined>>
) {
    
    // NOTE: it is assumed that all files that are NOT the files provided to this function should be
    //      deallocated
    const allocateFiles = (currentIdx: number) => {
        if (!displayables) return;

        let toAllocate: ListedFile[];
        if (displayables.length <= ALLOCATE_COUNT) {
            toAllocate = [...displayables];
        }
        else {
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

            toAllocate = slice;
        }


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
        return null;
    }
    else if (files) {
        location.state = {};
        setDisplayables(files);
    };


    return allocateFiles;
}