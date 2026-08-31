let trackContext = null;
export function setTrackContext(ctx) {
    trackContext = ctx;
}
export function state(initial) {
    let val = initial;
    const fns = new Set();
    const s = {
        get: () => {
            if (trackContext)
                trackContext.reg(s);
            return val;
        },
        set: (v) => {
            if (Object.is(val, v))
                return;
            val = v;
            for (const fn of fns)
                fn();
        },
        subscribe: (fn) => { fns.add(fn); },
        unsubscribe: (fn) => { fns.delete(fn); },
    };
    return s;
}
