const displayables = new Array(100).map((_, index) => index);

for (let ALLOCATE_COUNT = 1; ALLOCATE_COUNT < 20; ALLOCATE_COUNT++) {

    for (let currentIdx = 0; currentIdx < displayables.length; currentIdx++) {
        
        let start = currentIdx - (Math.floor(ALLOCATE_COUNT / 2));
        let end = currentIdx + (Math.ceil(ALLOCATE_COUNT / 2) - 1)
        if (start < 0) {
            start = displayables.length + start;
        }
        
        if (end >= displayables.length) {
            end = end - displayables.length;
        }
        
        
        let slice = null;
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
    
        if (slice.length != ALLOCATE_COUNT) {
            console.log("Current idx:   " + currentIdx);
            console.log("Start:         " + start);
            console.log("End:           " + end);
            console.log("Slice size:    " + slice.length);
            console.log("Expected size: " + ALLOCATE_COUNT);
            console.log("========================================")
        }
    }
}
