(function (g) {

    const U = {
        keyBy: (a, f) => a.reduce((prev,el) => {
            const [p, v] = f(el);
            prev[p] = v;
            return prev;
        }, {})
    }

    class ElementBuilder {
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

        addClass(c) {
            this._el.classList.add(c);
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

    const xCoef = 1, xStep = 20;
    let translateY = (y) => y;

    function createChart(options) {
        const {el, chartData} = options;
        const {colors, columns, /*names,*/ types} = chartData;
        const chartColumnsIds = Object.keys(types).filter(t => types[t] !== 'x');
        const xColumnId = Object.keys(types).find(t => types[t] === 'x');
        const columnsMap = {};
        for(let c of columns) {
            columnsMap[c[0]] = c;
        }
        
        let state = {
            disabled: U.keyBy(chartColumnsIds, (id) => [id, false]),
            visibleRange: { from: 0, to: 100},
            aspectRatio: 2/1,
            elements: {
                linesElements: {},

            }
        };

        const createSVG = (type) => new ElementBuilder(document.createElementNS('http://www.w3.org/2000/svg', type));
        const createEl = (type) => new ElementBuilder(document.createElement(type));
    
        const getBounds = (s) => {
            // const ty = !!s;
            s = s || {
                disabled: {},
                visibleRange: { from: 0, to: 100}
            }
            
            const visibleLines = chartColumnsIds.filter(lid => !s.disabled[lid]).map(lid => columnsMap[lid]);
            const xColumn = columnsMap[xColumnId];
            // TODO line contains only one point, take into sibling points

            const visibleIndexRange = {
                from: 1 + (xColumn.length - 1) * s.visibleRange.from / 100,
                to: (xColumn.length - 1) * s.visibleRange.to / 100
            };
            
            let yMax = Math.max(...visibleLines.map(l => Math.max(...l.slice(visibleIndexRange.from, visibleIndexRange.to + 1))));
            let yMin = Math.min(...visibleLines.map(l => Math.min(...l.slice(visibleIndexRange.from, visibleIndexRange.to + 1))));
            
            const xSize = (xColumn.length - 2) * xStep;
            const xMin = xSize * s.visibleRange.from / 100;
            const xMax = xSize * s.visibleRange.to / 100;

            // if(ty) {
            //     const yMaxOld = yMax;
            //     yMax = translateY(yMin);
            //     yMin = translateY(yMaxOld);
            // }

            return [xMin, xMax, 0 /*yMin*/, yMax];
        };

        const init = () => {
            
            const fullBounds = getBounds(null);
            state.fullBounds = fullBounds;
            const [xMin, xMax, yMin, yMax] = fullBounds;

            const width = xMax - xMin, height = yMax - yMin;
            const aspectRatio = 2/1;
                
            let yScale = 1 / (height / width) / aspectRatio;
            
            //const viewBoxPadding = 0;
            const viewBoxPadding = 0.05 * Math.min((xMax - xMin) * xCoef, (yMax - yMin) * yScale );
            const viewBox = [xMin * xCoef - viewBoxPadding,  yMin * yScale -viewBoxPadding,  
                (xMax - xMin) * xCoef + 2 * viewBoxPadding, (yMax - yMin) * yScale + 2 * viewBoxPadding];
            
            
            translateY = (y) => -(y - yMin) + yMax /* -yMin  */;    
                
            const svgEl = createSVG('svg')
            .style('width', '100%')
            .style('height', '100%')
            .attr('viewBox', `${viewBox[0]} ${viewBox[1]} ${viewBox[2]} ${viewBox[3]}`)
            .attr('zoom', 1);
            
            // TODO chekc view port when xmin really more  0
            // TODO use clip?
            // TODO need to scle coordinates to minimive viewposrt of svg?

            const initalTransform = `matrix(1, 0, 0, ${yScale}, 0, 0)`;

            //const initalTransform = `matrix(1, 0, 0, 1, 0, 0)`;

            const lc = 10;
            const hGridLines =  createSVG('g')
            .addClass('animate-transform')
            .style('vector-effect', 'non-scaling-stroke')
            .style('stroke', 'gray')
            .style('fill', 'none')
            .style('vector-effect', 'non-scaling-stroke')
            .attr('transform', initalTransform)
            .appendTo(svgEl);
            
            for(let i = 0;i<=lc;i++) {
                let y = yMin + (yMax - yMin) / lc * i;
                createSVG('path')
                .style('stroke-width', '1px')
                .style('vector-effect', 'non-scaling-stroke')
                .attr('d',  'M0 ' + y + ' L' + xMax +' ' + y)
                .appendTo(hGridLines);    
            }    

            state.elements.hGridLines = hGridLines;

            const columnIds = Object.keys(types);

            // ==>> TODO !!!! invert coordinates !!!!

            const lineElements = {};
            const linesGC = createSVG('g')
            .addClass('animate-transform')
            .attr('transform', initalTransform)
            .appendTo(svgEl);
            const linesG = createSVG('g')
            .appendTo(linesGC);

            for (let columnIndex = 0; columnIndex< columnIds.length; columnIndex++) {
                const columnName = columnIds[columnIndex], 
                    t = types[columnName],
                    color = colors[columnName],
                    c = columnsMap[columnName];
                
                if (t === 'line') {
                    let d = '';
                    for(let pIdx = 1; pIdx < c.length; pIdx++) {
                        d += (pIdx == 1 ? 'M' : 'L');
                        d += (pIdx - 1) * xStep * xCoef;
                        d += ' ';
                        d += translateY(c[pIdx]);
                    }
                    const p =createSVG('path')
                    .attr('d', d)
                    .style('stroke', color)
                    .style('stroke-width', '2px')
                    .style('vector-effect', 'non-scaling-stroke')
                    .style('fill', 'none')
                    .appendTo(linesG);
                    
                    lineElements[columnName] = p.el; 
                } else if (t === 'x') {
                    // todo create x axis
                }
            }

            state.elements.linesElements = lineElements;
            state.elements.linesGC = linesGC;
            state.elements.linesG = linesG;

            svgEl.appendTo(el);

            //const sliderEl = document.createElement('div');
            //sliderEl.classList.add('chart-slider');

            const sliderEl = createEl('input')
            .attr('type', 'range')
            .attr('min', '0')
            .attr('max', '100')
            .attr('step', '0.1')
            .attr('value', '100')
            .style('width', '100%').el;
            
            const onSliderChange = (e) => {
                const val = Math.max(e.target.value, 3);
                // 0 <= val <= 100
                setRange({from: 0, to: val});
            };
            sliderEl.onchange = onSliderChange;
            sliderEl.oninput = onSliderChange;

            el.appendChild(sliderEl);
        }
    
        const setRange = (range) => {
            
            range = range || {from: 0, to: 100};
            state.visibleRange = range;
            
            const W = state.fullBounds[1] - state.fullBounds[0], H = state.fullBounds[3] - state.fullBounds[2], fbyMax = state.fullBounds[3];

            const [xMin, xMax, yMin, yMax] = getBounds(state);


            const w = xMax - xMin, h = yMax - yMin;
            const aspectRatio = 2/1;
                 
            const xScale = W/w;
            const yScale = 1 / (h / W) / aspectRatio;
            // TODO translate center of chart to (0,0) before scale!
            const dx = -xMin, dy = 0 /*-yMin*/;

            const verticalTransform = `matrix(1,0,0,1,0,${yMax * yScale}) matrix(1,0,0,${yScale},0,0) matrix(1,0,0,1,0,${-fbyMax})`;
            //const verticalTransform = `matrix(1,0,0,1,0,${yMax  - (yScale - 1) * (yMax - yMin)}) matrix(1,0,0,${yScale},0,0) matrix(1,0,0,1,0,${-yMax})`;
            //const verticalTransform = `matrix(1,0,0,${yScale},0,0)`;
            console.log('Bounds', xMin, xMax, yMin, yMax);
            console.log(` ${yScale} = yScale = 1 / (${h} / ${W}) / ${aspectRatio}; ${h/H} = (h/H) = (${h}/${H})`);
            console.log(`W ${W} w ${w} h ${h} xScale ${xScale} yScale ${yScale}`);
            console.log(`VT ${verticalTransform}`);
            const horizontalTransform = `matrix(1,0,0,1,${dx},0) matrix(${xScale},0,0,1,0,0)`;
            state.elements.linesGC.attr('transform', verticalTransform);
            state.elements.linesG.attr('transform', horizontalTransform);
            
            state.elements.hGridLines.attr('transform', verticalTransform);

            // for(let l of Object.values(state.elements.linesElements)) {
            //     l.setAttribute('transform', t);
            // }
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

