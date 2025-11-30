import { StrictMode, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import reactLogo from './assets/react.svg'

import appLogo from '/favicon.svg'
import PWABadge from './PWABadge.tsx'

import './style/index.css'
import './style/App.css'

import {image} from './content/image.tsx';
import {image2} from './content/image2.tsx';
import {image3} from './content/image3.tsx';
import {video} from './content/video.tsx';
import {video2} from './content/video2.tsx';
import {video3} from './content/video3.tsx';
import { Displayable, type DisplayContent } from './components/Displayable.tsx'

export type Pos = [ number, number ];

const initalMovementWindow: [Pos, Pos, Pos] = [
    [0, 0],
    [0, 0],
    [0, 0],
];

function App() {
    const downPosition = useRef<Pos>(null);
    const [ offset, setOffset ] = useState<Pos | null>(null);
    const [ latestPosition, setLatestPosition ] = useState<Pos | null>(null);

    const [ displayables, setDisplayables ] = useState<DisplayContent[]>([
        [ 'image', image ],
        [ 'image', image2 ],
        [ 'image', image3 ],
        [ 'video', video ],
        [ 'video', video2 ],
        [ 'video', video3 ],
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
    const [ movementWindow, setMovementWindow ] = useState<[Pos, Pos, Pos]>(initalMovementWindow);

    return (
        <>
            <PWABadge />
            <div 
                id="video-container" 
                className="video-container"
                onMouseDown={ev => {
                    downPosition.current = [
                        ev.pageX,
                        ev.pageY
                    ];
                }}
                onMouseMove={ev => {
                    if (downPosition.current) {
                        const [ initialX, initialY ] = downPosition.current;
                        
                        setMovementWindow(prevWindow => {
                            return [
                                prevWindow[1],
                                prevWindow[2],
                                [ ev.movementX, ev.movementY ]
                            ];
                        });

                        setOffset([
                            (initialX - ev.pageX) * -1,
                            (initialY - ev.pageY) * -1
                        ]);
                        setLatestPosition([
                            ev.pageX,
                            ev.pageY
                        ]);
                    }
                }}
                onMouseUp={() => {
                    if (!containerRef.current) {
                        return reset();
                    }

                    const [ accX, accY ]: Pos = movementWindow.reduce(([ aX, aY ], [ cX, cY ]) => {
                        return [ aX + cX, aY + cY ];
                    }, [ 0, 0 ]);

                    const threshWidth = containerRef.current.clientWidth / 200;
                    const threshHeight = containerRef.current.clientHeight / 10;

                    if (Math.abs(accX) >= threshWidth) {
                        if (accX < 0) {
                            console.log("GO OFF LEFT");
                            moveDisplayableIndex(-1);
                        }
                        else {
                            console.log("GO OFF RIGHT");
                            moveDisplayableIndex(1);
                        }
                    }
                    else if (Math.abs(accY) >= threshHeight) {
                        if (accY < 0) {
                            console.log("GO OFF TOP");
                        }
                        else {
                            console.log("GO OFF BOTTOM");
                        }
                    }

                    reset();
                }}
                onMouseLeave={ev => {
                    if (!offset) return;
                    if (!containerRef.current) return;

                    if (ev.clientX < 0.05) {
                        console.log("WENT OFF LEFT");
                        moveDisplayableIndex(-1);
                    }
                    else if (ev.clientY < 0.05) {
                        console.log("WENT OFF TOP");
                    }
                    else if (ev.clientX / containerRef.current.clientWidth >= 0.95) {
                        console.log("WENT OFF RIGHT");
                        moveDisplayableIndex(1);
                    }
                    else if (ev.clientY / containerRef.current.clientHeight >= 0.95) {
                        console.log("WENT OFF BOTTOM");
                    }
                }}
                ref={containerRef}
            >
                <Displayable display={displayables[displayableIndex]} offset={offset} />
            </div>
        </>
    )
}


createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);

