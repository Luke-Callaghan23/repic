import { useEffect, useRef, useState, type ReactElement } from "react";
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
    const mediaRef = useRef<HTMLElement | null>(null);
    useEffect(() => {
        if (!mediaRef.current) return;
        if (mediaRef.current.tagName !== 'VIDEO') return;

        const video = mediaRef.current as HTMLVideoElement;
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
            if (!mediaRef.current) return;
            if (mediaRef.current.tagName !== 'VIDEO') return;

            const video = mediaRef.current as HTMLVideoElement;

            // Not sure exactly what this does, but it does seem to destroy the video
            video.pause();
            video.removeAttribute('src');
            video.load();
        };
    }, [ file ]);


    // Manually set the width and height for the overlay text
    const [overlayStyle, setOverlayStyle] = useState<{ width?: string, height?: string }>({});
    useEffect(() => {
        const updateOverlay = () => {
            if (!mediaRef.current) return;
            
            const media = mediaRef.current;
            const container = media.parentElement!;
            
            // Get natural and displayed dimensions

            let naturalWidth, naturalHeight;

            if (media.tagName === 'VIDEO') {
                const video = media as HTMLVideoElement;
                naturalWidth = video.videoWidth;
                naturalHeight = video.videoHeight;
            } 
            else {
                const image = media as HTMLImageElement;
                naturalWidth = image.naturalWidth;
                naturalHeight = image.naturalHeight;
            }

            console.log("HELLO");
            console.log([ naturalWidth, naturalHeight ])
            
            // Skip if dimensions aren't loaded yet
            if (!naturalWidth || !naturalHeight) return;

            const naturalRatio = naturalWidth / naturalHeight;
            const containerRatio = container.clientWidth / container.clientHeight;
            
            let width, height;
            
            if (naturalRatio > containerRatio) {
                // Media is wider - letterboxed top/bottom
                width = container.clientWidth;
                height = width / naturalRatio;
            } else {
                // Media is taller - letterboxed left/right
                height = container.clientHeight;
                width = height * naturalRatio;
            }
            
            setOverlayStyle({
                width: `${width}px`,
                height: `${height}px`,
            });
        };

        if (!mediaRef.current) return;

        
        const media = mediaRef.current;
        if (media.tagName === 'VIDEO') {
            // For videos, use 'loadedmetadata' event
            media.addEventListener('loadedmetadata', updateOverlay);
        } 
        else {
            const img = media as HTMLImageElement;

            // For images, use 'load' event
            if (img.complete) {
                updateOverlay();
            } 
            else {
                img.addEventListener('load', updateOverlay);
            }
        }
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
                // @ts-ignore
                ref={mediaRef}
                src={dataUrl} 
                onDragStart={e => {e.preventDefault(); return false;}}
            />
        }
        else {
            return <video 
                // @ts-ignore
                ref={mediaRef}

                // When the page first loads, the mp4 only shows the poster, not the
                //      video source
                // For performance reasons (see comments above)
                poster={file.data.posterUrl || undefined}
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
    
    return <>
        <div key={dataUrl} className="image" style={off}>
            {content}
            <div className="image-overlay" style={overlayStyle}>
                {memory !== null && <span className="memory-text">{formatBytes(memory)}</span>}
                <span className="image-text">{idx+1}/{fullCount}</span>
                <span className="filename-text">{file.file.name}</span>
            </div>
        </div>
    </>;
}