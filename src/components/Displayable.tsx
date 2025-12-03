import type { ReactElement } from "react";
import type { ListedFile } from "../App";
import type { Pos } from "../Scroller";
import { SyncLoader } from "react-spinners";

export interface DisplayableProps {
    file: ListedFile,
    offset: Pos | null,
    idx: number,
    fullCount: number,
};


export const Displayable = ({
    file,
    offset,
    idx,
    fullCount
}: DisplayableProps) => {
    if (!file.data.loaded) {
        return <SyncLoader />
    }

    const dataUrl = file.data.data;

    const contentType: 'image' | 'video' = file.file.type.startsWith('image/')
        ? 'image'
        : 'video';


    const content: ReactElement = (() => {
        if (contentType === 'image') {
            return <img 
                src={dataUrl} 
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
                key={dataUrl}
                autoPlay loop muted
                style={
                    offset ? { 
                        marginLeft: offset[0],
                        marginTop: offset[1] 
                    } : {}
                }
                onDragStart={e => {e.preventDefault(); return false;}}
            >
                <source type="video/mp4" src={dataUrl}/>
            </video>
        }
    })();

    return <div className="image">
        <span className="image-text" style={
            offset ? { 
                marginLeft: offset[0],
                marginTop: offset[1] 
            } : {}
        }>{idx+1}/{fullCount}</span>
        {content}
    </div>;
}