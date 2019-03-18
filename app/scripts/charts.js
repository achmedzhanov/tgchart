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

        textContent(value) {
            this._el.textContent = value;
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
        let {sizes} = options;
        sizes = sizes || {width: 500, height: 250};
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

            state.sizes = sizes;

            let xScale = sizes.width / xMax;
            let yScale = sizes.height / yMax;
            
            const viewBox = [ 0, 0, sizes.width, sizes.height];
            
            translateY = (y) => -(y - yMin) + yMax /* -yMin  */;    
                
            const svgEl = createSVG('svg')
            .style('width', sizes.width)
            .style('height', sizes.height)
            .attr('viewBox', `${viewBox[0]} ${viewBox[1]} ${viewBox[2]} ${viewBox[3]}`)
            .attr('zoom', 1);
            
            const initalTransform = `matrix(${xScale}, 0, 0, ${yScale}, 0, 0)`;

            const lc = 5;
            const hGridLines = [];
            const hGridTexts = [];
            const hGridLinesG =  createSVG('g')
            .addClass('animate-transform')
            .style('vector-effect', 'non-scaling-stroke')
            .appendTo(svgEl);
            
            for(let i = 0;i<=lc;i++) {
                // let yGraph = (yMax - yMin) / lc * i;
                // let y = yMin + (yMax - yMin) / lc * i * yScale;
                // const lEl = createSVG('path')
                // .style('stroke-width', '1px')
                // .style('stroke', 'lightblue')
                // .style('fill', 'none')
                // .style('vector-effect', 'non-scaling-stroke')
                // .attr('d',  'M0 ' + y + ' L' + (xMax * xScale) +' ' + y)
                // .appendTo(hGridLinesG);
                // hGridLines.push(lEl);

                // const tEl = createSVG('text')
                // .attr('x',  '0')
                // .attr('y',  y - 5)
                // // .attr('font-family', ' "Helvetica Neue", Helvetica, Arial, sans-serif')
                // .attr('font-family', 'sans-serif')
                // .attr('font-size', '14')
                // .attr('fill', 'gray')
                // .textContent('' + translateY(yGraph))
                // .appendTo(hGridLinesG);
                // hGridTexts.push(tEl);

            }    

            state.elements.hGridLinesG = hGridLinesG;
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
            if(state.visibleRange.from == range.from && state.visibleRange.to == range.to) return;
            
            const prevBounds = getBounds(state);

            state.visibleRange = range;
            
            const W = state.fullBounds[1] - state.fullBounds[0], H = state.fullBounds[3] - state.fullBounds[2], fbyMax = state.fullBounds[3];

            const newBounds = getBounds(state);
            const [xMin, xMax, yMin, yMax] = newBounds;

            const w = xMax - xMin, h = yMax - yMin;
            const aspectRatio = 2/1;

            let xScale = state.sizes.width / xMax;
            let yScale = state.sizes.height / yMax;

            const dx = -xMin, dy = 0 /*-yMin*/;

            const verticalTransform = `matrix(1,0,0,1,0,${yMax * yScale}) matrix(1,0,0,${yScale},0,0) matrix(1,0,0,1,0,${-fbyMax})`;
            const horizontalTransform = `matrix(1,0,0,1,${dx},0) matrix(${xScale},0,0,1,0,0)`;
            state.elements.linesGC.attr('transform', verticalTransform);
            state.elements.linesG.attr('transform', horizontalTransform);

            //state.elements.hGridLinesG.attr('transform', verticalTransform);

            if(prevBounds[2] !== yMin || prevBounds[3] !== yMax) {
                // update y axis lines
                //state.elements.hGridLinesG.attr('transform', 'none');
                const linesCount = state.elements.hGridLines.length;
                let prevYScale = state.sizes.height / prevBounds[3]
                const lc = 5;

                const newLines = calcYAxis(yScale, prevBounds, lc);
                console.log('newLines', newLines);
                const gridElements = createYGridLines(newLines, (el) => el.style('opacity', '0.1'));
                const movedLines = calcYAxis(yScale, newBounds, lc);
                console.log('movedLines', movedLines);
                setTimeout(() => {
                updateYGridLines(gridElements, movedLines, (el) => el.style('opacity', '1'));
                }, 0);
            }
        }

        const calcYAxis = (yScale, bounds, lc) => {
            const [xMin, xMax, yMin, yMax] = bounds;
            const lines = [];

            for(let i = 0;i<=lc;i++) {
                let yGraph = (yMax - yMin) / lc * i;
                let y = yMin + (yMax - yMin) / lc * i * yScale;
                lines.push({y: y, yGraph: yGraph, text: translateY(yGraph)});
            }
            
            return lines;
        }        

        const createYGridLines = (lines, cb) => {
            
            const hGridLines = [];
            const hGridTexts = [];
            const hGridLinesG =  state.elements.hGridLinesG;
            
            const lc = lines.length;
            for(let i = 0;i < lc;i++) {
                let y = lines[i].y;
                const lEl = createSVG('path')
                .style('stroke-width', '1px')
                .style('stroke', 'lightblue')
                .style('fill', 'none')
                .style('vector-effect', 'non-scaling-stroke')
                .attr('d',  'M0 ' + y + ' L' + (state.sizes.width) +' ' + y)
                .addClass('animate-transform-opacity')
                .appendTo(hGridLinesG);
                hGridLines.push(lEl);
                cb(lEl);
    
                const tEl = createSVG('text')
                .attr('x',  '0')
                .attr('y',  y - 5)
                .attr('font-family', 'sans-serif')
                .attr('font-size', '14')
                .attr('fill', 'gray')
                .textContent('' + lines[i].text)
                .addClass('animate-transform-opacity')
                .appendTo(hGridLinesG);
                hGridTexts.push(tEl);
                cb(tEl);
    
            }     
            return {hGridLines, hGridTexts};       
        }

        const updateYGridLines = (gridElements, lines, cb) => {
            const {hGridLines, hGridTexts} = gridElements;
            const lc = lines.length;
            for(let i = 0; i < lc; i++) {
                let y = lines[i].y;
                
                hGridLines[i].attr('d',  'M0 ' + y + ' L' + (state.sizes.width) +' ' + y);
                cb(hGridLines[i]);
                
                hGridTexts[i]
                .textContent('' + lines[i].text)
                .attr('x',  '0')
                .attr('y',  y - 5);
                cb(hGridTexts[i]);
            }     
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

