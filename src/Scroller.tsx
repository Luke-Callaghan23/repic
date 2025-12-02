import { StrictMode, useEffect, useRef, type MouseEvent } from 'react'
import { useState } from 'react'
import PWABadge from './PWABadge.tsx'

import {image} from './content/image.tsx';
import {image2} from './content/image2.tsx';
import {image3} from './content/image3.tsx';
// import {video} from './content/video.tsx';
// import {video2} from './content/video2.tsx';
// import {video3} from './content/video3.tsx';
import { Displayable, type DisplayContent } from './components/Displayable.tsx'

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

export function Scroller() {
    const downPosition = useRef<Pos>(null);
    const [ offset, setOffset ] = useState<Pos | null>(null);
    const [ latestPosition, setLatestPosition ] = useState<Pos | null>(null);

    const [ displayables, setDisplayables ] = useState<DisplayContent[]>([
        [ 'image', image ],
        [ 'image', image2 ],
        [ 'image', image3 ],
        // [ 'video', video ],
        // [ 'video', video2 ],
        // [ 'video', video3 ],
    ]);
    const [ displayableIndex, setDisplayableIndex ] = useState<number>(0);
    const moveDisplayableIndex = (direction: -1 | 1) => {
        reset();
        setDisplayableIndex(currentIdx => {
            const tmp = (currentIdx + direction);
            if (tmp < 0) {
                return displayables.length - 1;
            }
            else if (tmp === displayables.length) {
                return 0;
            }
            else return tmp;
        })
    };

    const reset = () => {
        downPosition.current = null;
        setOffset(null);
        setLatestPosition(null);
        setMovementWindow(initalMovementWindow);
    }

    const containerRef = useRef<HTMLDivElement>(null);
    const [ movementWindow, setMovementWindow ] = useState<MovementWindow>(initalMovementWindow);

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
        const threshHeight = containerRef.current.clientHeight / 10;

        if (Math.abs(accX) >= threshWidth) {
            if (accX < 0) {
                console.log("GO OFF LEFT");
                moveDisplayableIndex(1);
            }
            else {
                console.log("GO OFF RIGHT");
                moveDisplayableIndex(-1);
            }
        }
        else if (Math.abs(accY) >= threshHeight) {
            if (accY < 0) {
                console.log("GO OFF TOP");
                window.location.href = '/';
            }
            else {
                console.log("GO OFF BOTTOM");
                window.location.href = '/';
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
                <Displayable display={displayables[displayableIndex]} offset={offset} />
            </div>
        </>
    )
}



