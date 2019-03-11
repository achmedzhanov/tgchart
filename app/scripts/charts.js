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

            const svgEl = createSVG('svg')
                .style('width', '100%')
                .style('height', '100%')
                .attr('viewBox', xMin * xCoef + ' ' + yMin * yCoef + ' ' + xMax * xCoef + ' ' + yMax * yCoef)
                //.style('vector-effect', 'non-scaling-stroke')
                
                .attr('zoom', 1); // todo set width, height, viewbox etc
    
            const columnNames = Object.keys(types);

            // todo invert coordinates
            // calculate max, min

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
                    createSVG('path')
                        .attr('d', d)
                        .style('stroke', color)
                        .style('stroke-width', '3px')
                        // vector-effect: non-scaling-stroke
                        .style('vector-effect', 'non-scaling-stroke')
                        .attr('transform', 'matrix(5, 0, 0, 5, 0, 0)')
                        .style('fill', 'none')
                        .appendTo(svgEl);
                } else if (t === 'x') {
                    // todo create x axis
                }
            }
    
            svgEl.appendTo(el);
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

