(function (g) {
    class SVGElement {
        constructor(el) {
            this._el = el;
        }
    
        attr(name, value) {
            this._el.setAttribute(name, value);
            return this;
        }
    
        style(name, value) {
            this._el.style[name] = value;
            return this;
        }
    
        appendTo(parent) {
            if(parent.el) 
                parent.el.appendChild(this._el);
            else
                parent.appendChild(this._el);
            return this;
        }
    
        get el() {
            return this._el;
        }
    }

    const xCoef = 1, yCoef = 1, xStep = 20;

    function createChart(options) {
        const {el, chartData} = options;
        const {colors, columns, names, types} = chartData;
        const columnsMap = {};
        for(let c of columns) {
            columnsMap[c[0]] = c;
        }
        
        const createSVG = (type) => new SVGElement(document.createElementNS('http://www.w3.org/2000/svg', type));
    
        const getStats = () => {
            const lines = Object.keys(types).filter(t => types[t] !== 'x').map(t => columnsMap[t]);
            const xColumn = columnsMap[Object.keys(types).find(t => types[t] === 'x')];
            const yMax = Math.max(...lines.map(l => Math.max(...l.slice(1))));
            const yMin = Math.min(...lines.map(l => Math.min(...l.slice(1))));
            const xMin = 0;
            const xMax = (xColumn.length - 1) * xStep;
            return {xMin, xMax, yMin, yMax};
        };

        const init = () => {
            
            const {xMin, xMax, yMin, yMax} = getStats();

            const width = xMax - xMin, height = yMax - yMin;
            const aspectRatio = 2/1;
                
            let yScale = 1 / (height / width) / aspectRatio;

            
            const viewBoxPadding = 50;
            const viewBox = [xMin * xCoef - viewBoxPadding,  yMin * yScale -viewBoxPadding,  
                xMax * xCoef + viewBoxPadding, yMax * yScale + viewBoxPadding];
                
            const svgEl = createSVG('svg')
            .style('width', '100%')
            .style('height', '100%')
            .attr('viewBox', `${viewBox[0]} ${viewBox[1]} ${viewBox[2]} ${viewBox[3]}`)
            //.style('vector-effect', 'non-scaling-stroke')
            .attr('zoom', 1); // todo set width, height, viewbox etc
            
            // TODO chekc view port when xmin really more  0

            // TODO use clip?

            // TODO need to scle coordinates to minimive viewposrt of svg?

            const initalTransform = `matrix(1, 0, 0, ${yScale}, 0, 0)`;

            const lc = 5;
            const lineGEl =  createSVG('g')
            .style('stroke-width', '1px')
                    .style('vector-effect', 'non-scaling-stroke')
                    .style('stroke', 'gray')
                    .style('fill', 'none')
                    .style('vector-effect', 'non-scaling-stroke')
                    .attr('transform', initalTransform)
                    .appendTo(svgEl);
            for(let i = 0;i<=lc;i++) {
                    let y = yMin + (yMax - yMin) / lc * i;
                    createSVG('path')
                    .attr('d',  'M0 ' + y + ' L' + xMax +' ' + y)
                    .appendTo(lineGEl);    
                }    

            const columnNames = Object.keys(types);

            // ==>> TODO !!!! invert coordinates !!!!

            const lineElements = {};

            for (let columnIndex = 0; columnIndex< columnNames.length; columnIndex++) {
                const columnName = columnNames[columnIndex], 
                    t = types[columnName],
                    n = names[columnName],
                    color = colors[columnName],
                    c = columnsMap[columnName];
                
                if (t === 'line') {
                    let d = '';
                    for(let pIdx = 1; pIdx < c.length; pIdx++) {
                        d += (pIdx == 1 ? 'M' : 'L');
                        d += (pIdx - 1) * xStep * xCoef;
                        d += ' ';
                        d += c[pIdx] * yCoef;
                    }
                    const p =createSVG('path')
                        .attr('d', d)
                        .style('stroke', color)
                        .style('stroke-width', '2px')
                        // vector-effect: non-scaling-stroke
                        .style('vector-effect', 'non-scaling-stroke')
                        .attr('transform', initalTransform)
                        .style('fill', 'none')
                        .appendTo(svgEl);
                    lineElements[columnName] = p.el; 
                } else if (t === 'x') {
                    // todo create x axis
                }
            }

            svgEl.appendTo(el);

            //const sliderEl = document.createElement('div');
            //sliderEl.classList.add('chart-slider');

            const sliderEl = document.createElement('input');
            sliderEl.setAttribute('type', 'range');
            sliderEl.setAttribute('min', '0');
            sliderEl.setAttribute('max', '100');
            sliderEl.setAttribute('step', '0.1');
            sliderEl.setAttribute('value', '100');
            sliderEl.style['width'] = '100%';
            const onSliderChange = (e) => {
                const val = Math.max(e.target.value, 3);
                console.log('range-val', val, performance.now());
                const t = `matrix(${100/val},0,0,${yScale},0,0)`;
                for(let l of Object.values(lineElements)) {
                    l.setAttribute('transform', t);
                }
            };
            sliderEl.onchange = onSliderChange;
            sliderEl.oninput = onSliderChange;

            el.appendChild(sliderEl);

            /* <input id="vol-control" type="range" min="0" max="100" step="1" oninput="SetVolume(this.value)" onchange="SetVolume(this.value)"></input>  */            
    


        }
    
        init();
    }
    
    function onDocumentReady(cb) {
        if(document.readyState !== 'loading') {
            cb();
        } else {
            document.addEventListener('DOMContentLoaded', cb);
        }
    }    

    g.onDocumentReady = onDocumentReady;
    g.createChart = createChart;

})(window);

