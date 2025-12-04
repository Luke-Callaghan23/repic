import { useState } from 'react'
import PWABadge from '../../PWABadge.tsx'

// import {image} from './content/image.tsx';
// import {image2} from './content/image2.tsx';
// import {image3} from './content/image3.tsx';
// import {video} from './content/video.tsx';
// import {video2} from './content/video2.tsx';
// import {video3} from './content/video3.tsx';
import { Displayable } from './components/Displayable.tsx'
import type { ListedFile } from '../../App.tsx';
import { useScrollerDrag } from './useScrollerDrag.tsx';
import { useFileAllocations } from './useFileAllocation.tsx';

export type Pos = [ number, number ];

export interface ScrollerNavigateState {
    files: ListedFile[] | null,
}


export interface ScrollerProps {
    memory: number | null;
}

export function Scroller({ memory }: ScrollerProps) {
    const [ displayables, setDisplayables ] = useState<ListedFile[] | null>();
    const [ displayableIndex, setDisplayableIndex ] = useState<number>(0);

    const allocateFiles = useFileAllocations(
        displayableIndex,
        displayables,
        setDisplayables
    );
    
    const moveDisplayableIndex = (direction: -1 | 1) => {
        if (!displayables || !allocateFiles) return;
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

    const {
        offset,
        containerRef,
        onMouseDown,
        onMouseMove,
        onMouseLeave,
        onMouseUp,
    } = useScrollerDrag(moveDisplayableIndex);

    if (!allocateFiles) {
        return <>
            <h2>No files retrieved.  please return to file select.</h2>
            <button onClick={() => window.location.href = '/'}>Return</button>
        </>
    }

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

                onKeyDown={ev => console.log(ev)}

                onKeyUp={ev => {
                    if (ev.key === 'ArrowLeft') {
                        moveDisplayableIndex(-1);
                    }
                    else if (ev.key === 'ArrowRight') {
                        moveDisplayableIndex(1);
                    }
                }}
                tabIndex={0}
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



