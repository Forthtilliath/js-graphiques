function strToDom(str) {
    return document.createRange().createContextualFragment(str).firstChild;
}

function easeOutExpo(x) {
    return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    toSvgPath() {
        return `${this.x} ${this.y}`;
    }

    static fromAngle(angle) {
        return new Point(Math.cos(angle), Math.sin(angle));
    }
}

/**
 * @property {number[]} data
 * @property {SVGPathElement[]} paths
 */
class PieChart extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        const labels = this.getAttribute('labels')?.split(';') ?? [];
        const colors = this.getAttribute('colors')?.split(';') ?? [
            '#faaa32',
            '#3efa7d',
            '#fa6a25',
            '#0c94fa',
            '#fa1f19',
            '#0cfae2',
            '#00a11e',
        ];
        this.data = this.getAttribute('data')
            .split(';')
            .map((v) => parseFloat(v));
        const gap = this.getAttribute('gap') ?? '0.015';
        const donut = this.getAttribute('donut') ?? '0.005';

        const svg = strToDom(`<svg viewBox="-1 -1 2 2">
            <g mask="url(#graphMask)"></g>
            <mask id="graphMask">
                <rect fill="white" x="-1" y="-1" width="2" height="2" />
                <circle fill="black" r="${donut}" />
            </mask>
        </svg>`);
        const pathGroup = svg.querySelector('g');
        const maskGroup = svg.querySelector('mask');

        // Fragments de camembert
        this.paths = this.data.map((_, i) => {
            const color = colors[i % colors.length];
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('fill', color);
            pathGroup.appendChild(path);
            path.addEventListener('mouseover', () => this.handlePathHover(i));
            path.addEventListener('mouseout', () => this.handlePathOut(i));
            return path;
        });

        // lignes entre les fragments
        this.lines = this.data.map(() => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('stroke', '#000');
            line.setAttribute('stroke-width', gap);
            line.setAttribute('x1', '0');
            line.setAttribute('y1', '0');
            maskGroup.appendChild(line);
            return line;
        });

        // Labels au survol des camemberts
        this.labels = labels.map((label) => {
            const div = document.createElement('div');
            div.innerText = label;
            shadow.appendChild(div);
            return div;
        });

        const style = document.createElement('style');
        style.innerHTML = `
            :host {
                display: block;
                position: relative;
            }
            svg {
                width: 100%;
                height: 100%;
            }
            path {
                cursor: pointer;
                transition: opacity .3s;
            }
            path:hover {
                opacity: 0.5;
            }
            div {
                position: absolute;
                top: 0;
                left: 0;
                font-size: .8rem;
                padding: .2em .4em;
                border-radius: 5px;
                transform: translate(-50%, -50%);
                background-color: var(--tooltip-bg, #fff);
                opacity: 0;
                transition: opacity .3s;
            }
            .is-active {
                opacity: 1;
            }
        `;

        shadow.appendChild(style);
        shadow.appendChild(svg);
    }

    // Une fois l'élément dans le DOM
    connectedCallback() {
        this.draw(1);
        const now = Date.now();
        const duration = 1000;
        const draw = () => {
            const t = (Date.now() - now) / duration;
            if (t < 1) {
                this.draw(easeOutExpo(t));
                window.requestAnimationFrame(draw);
            } else {
                this.draw(1);
            }
        };
        window.requestAnimationFrame(draw);
    }

    draw(progress = 1) {
        const total = this.data.reduce((acc, v) => acc + v, 0);
        let angle = Math.PI / -2;
        let start = new Point(0, -1);

        this.data.forEach((data, i) => {
            this.lines[i].setAttribute('x2', start.x);
            this.lines[i].setAttribute('y2', start.y);
            const ratio = (data / total) * progress;
            if (progress === 1) {
                this.positionLabel(this.labels[i], angle + ratio * Math.PI);
            }
            angle += ratio * 2 * Math.PI;
            const end = Point.fromAngle(angle);
            const largeFlag = ratio > 0.5 ? 1 : 0;
            this.paths[i].setAttribute(
                'd',
                `M 0 0 L ${start.toSvgPath()} A 1 1 0 ${largeFlag} 1  ${end.toSvgPath()} L 0 0`,
            );
            start = end;
        });
    }

    /**
     * Gère l'effet lorsque l'on survole l'élément
     * @param {number} i Index du tableau des labels
     */
    handlePathHover(i) {
        this.dispatchEvent(new CustomEvent('sectionhover', {detail:i}))
        this.labels[i]?.classList.add('is-active');
    }

    /**
     * Gère l'effet lorsque l'on quitte l'élément
     * @param {number} i Index du tableau des labels
     */
    handlePathOut(i) {
        this.labels[i]?.classList.remove('is-active');
    }

    /**
     * Positionne le label en fonction de l'angle
     * @param {HTMLDivElement|undefined} label
     * @param {number} angle
     */
    positionLabel(label, angle) {
        if (!label || !angle) return;
        const point = Point.fromAngle(angle);
        const positionnement = 1;
        label.style.setProperty('top', `${(point.y * positionnement * 0.5 + 0.5) * 100}%`);
        label.style.setProperty('left', `${(point.x * positionnement * 0.5 + 0.5) * 100}%`);
    }
}

customElements.define('pie-chart', PieChart);
