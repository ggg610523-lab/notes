import { setTrackContext, state } from './signal.js';
export { state };
export class Component {
    constructor() {
        this._el = null;
        this._links = new Map();
    }
    build() {
        this._beginTrack();
        const el = this.buildContent();
        this._endTrack();
        this._el = el;
        return el;
    }
    refresh() {
        if (!this._el || !this._el.parentNode)
            return;
        this._clearLinks();
        this._beginTrack();
        const next = this.buildContent();
        this._endTrack();
        this._el.parentNode.replaceChild(next, this._el);
        this._el = next;
    }
    onMount() { }
    onUnmount() { }
    get el() { return this._el; }
    _beginTrack() {
        setTrackContext({ reg: (s) => this._link(s) });
    }
    _endTrack() {
        setTrackContext(null);
    }
    _clearLinks() {
        for (const [s, cb] of this._links) {
            s.unsubscribe(cb);
        }
        this._links.clear();
    }
    _link(s) {
        if (this._links.has(s))
            return;
        const cb = () => this.refresh();
        this._links.set(s, cb);
        s.subscribe(cb);
    }
}
export function h(tag, attrs, events, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
        for (const [k, v] of Object.entries(attrs)) {
            if (v === null || v === undefined || v === false)
                el.removeAttribute(k);
            else
                el.setAttribute(k, String(v));
        }
    }
    if (events) {
        for (const [k, v] of Object.entries(events))
            el.addEventListener(k, v);
    }
    _fill(el, children);
    return el;
}
function _fill(parent, children) {
    for (const c of children) {
        if (c == null || c === false)
            continue;
        if (Array.isArray(c)) {
            _fill(parent, c);
            continue;
        }
        if (typeof c === 'string' || typeof c === 'number') {
            parent.appendChild(document.createTextNode(String(c)));
        }
        else {
            parent.appendChild(c);
        }
    }
}
