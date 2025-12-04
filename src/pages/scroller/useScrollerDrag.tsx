import { useRef, useState } from "react";
import type { Pos } from "./Scroller";


export type MovementWindow = [Pos, Pos, Pos, Pos, Pos, Pos];

const initalMovementWindow: MovementWindow = [
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
];

export function useScrollerDrag (
    moveDisplayableIndex: (direction: -1 | 1) => void,
) {

    const containerRef = useRef<HTMLDivElement>(null);
    
    const downPosition = useRef<Pos>(null);
    const [ offset, setOffset ] = useState<Pos | null>(null);
    const [ latestPosition, setLatestPosition ] = useState<Pos | null>(null);
    
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
                reset();
                moveDisplayableIndex(1);
            }
            else {
                console.log("GO OFF RIGHT");
                reset();
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
            reset();
            moveDisplayableIndex(1);
        }
        else if (clientY < 0.05) {
            console.log("WENT OFF TOP");
            window.location.href = '/';
        }
        else if (clientX / containerRef.current.clientWidth >= 0.95) {
            console.log("WENT OFF RIGHT");
            reset();
            moveDisplayableIndex(-1);
        }
        else if (clientY / containerRef.current.clientHeight >= 0.95) {
            console.log("WENT OFF BOTTOM");
            window.location.href = '/';
        }
    };

    
    const reset = () => {
        downPosition.current = null;
        setOffset(null);
        setLatestPosition(null);
        setMovementWindow(initalMovementWindow);
    };

    return {
        offset,
        containerRef,
        onMouseDown,
        onMouseMove,
        onMouseLeave,
        onMouseUp,
    }
}