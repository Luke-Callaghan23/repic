import { useEffect, useRef } from "react";
import type { ListedFile } from "../../App";
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

function getWrapparoundRange (
    currentIdx: number,
    displayables: ListedFile[],
): ListedFile[] {
    // Get the slice of ListedFiles to keep allocated
    if (displayables.length <= ALLOCATE_COUNT) {
        return [...displayables];
    }
    else {
        // Get a wrap-around slice of the displayables, centered around currentIdx
        //      with a total count of ALLOCATE_COUNT
        let start = currentIdx - (Math.floor(ALLOCATE_COUNT / 2));
        let end = currentIdx + (Math.ceil(ALLOCATE_COUNT / 2) - 1)

        // Account for start or end going past their bound by getting the corresponding index
        //      wrapped around to the other side of the array
        if (start < 0) {
            start = displayables.length + start;
        }
        if (end >= displayables.length) {
            end = end - displayables.length;
        }
        
        // If there was a wrap around, we need to get two separate slice.
        //      One is the "start" index to the end of the array
        //      The other is the beginning of the array to the end of the array
        // Say index == 0, and ALLOCATE_COUNT == 10 (default case), and displayables.length = 100
        //      After all the wrappings, start will be 100 - 5 = 95
        //          end will be 4
        //      So, we get a slice of [start, 100) and [0, end + 1)
        //          Which is one slice of the last five elements in the array
        //              plus one slice of the first five elements in the array
        //      Added together this is five elements on either side of index
        if (start > end) {
            const sliceA = displayables.slice(start, displayables.length);
            const sliceB = displayables.slice(0, end+1);
            return [
                ...sliceA,
                ...sliceB
            ]
        }
        else {
            return displayables.slice(start, end+1);
        }
    }
}


function deallocate (
    toAllocate: ListedFile[],
    displayables: ListedFile[],
    setDisplayables: React.Dispatch<React.SetStateAction<ListedFile[] | null | undefined>>
) {
    

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
        });
    }
}

function allocateHtml (
    file: ListedFile,
    arrayBuffer: ArrayBuffer,
    prev: ListedFile
): ListedFile {

    let posterUrl: string | undefined;
    let dataUrl: string;

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

    return {
        file: file.file,
        data: {
            loaded: true,
            data: dataUrl,
            posterUrl: posterUrl
        }
    }
}

function allocateGeneric (
    file: ListedFile,
    arrayBuffer: ArrayBuffer,
): ListedFile {
    // For most file types, just read the data and create a Blob
    const buffer = new Uint8Array(arrayBuffer!);
    const blob = new Blob([buffer], { type: file.file.type });
    const dataUrl = URL.createObjectURL(blob);

    return {
        file: file.file,
        data: {
            loaded: true,
            data: dataUrl,
        }
    }
}

function allocateFile (
    file: ListedFile,
    setDisplayables: React.Dispatch<React.SetStateAction<ListedFile[] | null | undefined>>
) {
    // Do nothing if the file is already allocated
    if (file.data.loaded) {
        return;
    }

    console.log("ALLOCATING: " + file.file.name);

    const reader = new FileReader();
    reader.readAsArrayBuffer(file.file);
    reader.onloadend = ev => {
        const arrayBuffer = ev!.target!.result as ArrayBuffer;
        setDisplayables(prevList => {
            if (!prevList) return null;
            
            // Once the reader returns data, search for this file in the files
            //      state and update it
            return prevList.map(prev => {
                if (prev.file !== file.file) return prev;
                if (prev.data.loaded) return prev;
                
                return (file.file.name.endsWith('.html')) 
                    ? allocateHtml(file, arrayBuffer, prev)
                    : allocateGeneric(file, arrayBuffer);
            });
        });
    }
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

        const toAllocate = getWrapparoundRange(currentIdx, displayables);

        deallocate(
            toAllocate,
            displayables,
            setDisplayables
        );

        // Allocate all the unallocated files from toAllocate
        for (const file of toAllocate) {
            allocateFile(file, setDisplayables);
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