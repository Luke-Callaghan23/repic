import { useEffect, useRef, type ReactElement } from "react";
import type { ListedFile } from "../App";
import type { Pos } from "../Scroller";
import { SyncLoader } from "react-spinners";

export interface DisplayableProps {
    file: ListedFile,
    offset: Pos | null,
    idx: number,
    fullCount: number,
    memory: number | null
};

function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes'
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}


export const Displayable = ({
    file,
    offset,
    idx,
    fullCount,
    memory
}: DisplayableProps) => {
    if (!file.data.loaded) {
        return <SyncLoader />
    }

    // FOR PERFORMANCE REASONS ON THE PHONE
    // Even when we only load 10 videos or images at a time and aggressively revoke the Data URLs
    //      when they go out of scope, there can still be some huge performance problems (by default) 
    //      if you scroll really quickly through a lot of mp4s
    // The phone's GPU is unable to handle so many, and even though the DOM element no longer
    //      appears on the page, there is still some lingering processing going on in the backgroun
    // So, this useEffect is meant to handle that problem
    const videoRef = useRef<HTMLVideoElement | null>(null);
    useEffect(() => {
        if (!videoRef.current) return;

        const video = videoRef.current;
        if (!video) return;
        
        // Firstly, when a video is loaded, anticipate that a user may just scroll right
        //      past it, and add a small delay between page loading and video playing
        video.src = file.data.loaded ? file.data.data : '';
        // ^^ it is okay however, to add the source -- without this, there will be an annoying flicker
        setTimeout(() => {
            video.play().catch(() => {});
        }, 250);

        // Then, when the file updates, manually force destroy the video
        return () => {
            if (!videoRef.current) return;
            // Not sure exactly what this does, but it does seem to destroy the video
            videoRef.current.pause();
            videoRef.current.removeAttribute('src');
            videoRef.current.load();
        };
    }, [ file ]);

    const dataUrl = file.data.data;

    const contentType: 'image' | 'video' = file.file.type.startsWith('image/')
        ? 'image'
        : 'video';

    const off = offset ? { 
        marginLeft: offset[0],
        marginTop: offset[1] 
    } : {};

    const content: ReactElement = (() => {
        if (contentType === 'image') {
            return <img 
                style={off}
                src={dataUrl} 
                onDragStart={e => {e.preventDefault(); return false;}}
            />
        }
        else {
            return <video 
                ref={videoRef}

                // When the page first loads, the mp4 only shows the poster, not the
                //      video source
                // For performance reasons (see comments above)
                poster={file.data.posterUrl || undefined}
                style={off}
                key={dataUrl}

                // Video behavior will mimic a gif
                autoPlay loop muted

                // On IOS, prevents the video from going full screen
                playsInline
                preload="none"
                onDragStart={e => {e.preventDefault(); return false;}}
            >
            </video>
        }
    })();

    return <div key={dataUrl} className="image">
        <span style={off} className="image-text">{idx+1}/{fullCount}</span>
        {memory !== null && <span style={off} className="memory-text">{formatBytes(memory)}</span>}
        <span style={off} className="filename-text">{file.file.name}</span>
        {content}
    </div>;
}