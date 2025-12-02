import type { Pos } from "../Scroller";

export type DisplayContent = [ 'video' | 'image', string ];

export const Displayable = ({
    display,
    offset
}: {
    display: DisplayContent,
    offset: Pos | null
}) => {
    const [ dType, dContent ] = display;

    if (dType === 'image') {
        return <img 
            src={`data:image/png;base64,${dContent}`} 
            style={
                offset ? { 
                    marginLeft: offset[0],
                    marginTop: offset[1] 
                } : {}
            }
            onDragStart={e => {e.preventDefault(); return false;}}
        />
    }
    else {
        return <video 
            key={dContent}
            autoPlay loop muted
            style={
                offset ? { 
                    marginLeft: offset[0],
                    marginTop: offset[1] 
                } : {}
            }
            onDragStart={e => {e.preventDefault(); return false;}}
        >
            {(() => {
                console.log(dContent.substring(0, 100))
                return <></>
            })()}
            <source type="video/mp4" src={`data:video/mp4;base64,${dContent}`}/>
        </video>
    }
}