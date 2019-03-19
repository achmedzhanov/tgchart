(function (g) {

    const U = {
        keyBy: (a, f) => a.reduce((prev,el) => {
            const [p, v] = f(el);
            prev[p] = v;
            return prev;
        }, {})
    }

    const mul = (m1, m2) => {
        return [
        m1[0] * m2[0] + m1[2] * m2[1],
        m1[1] * m2[0] + m1[3]* m2[1],
        m1[0] * m2[2] + m1[2] * m2[3],
        m1[1] * m2[2] + m1[3] * m2[3],
        m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
        m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
        ];
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

        innerText(value) {
            this._el.innerText = value;
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

        removeClass(c) {
            this._el.classList.remove(c);
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

    const createSVG = (type) => new ElementBuilder(document.createElementNS('http://www.w3.org/2000/svg', type));
    const createEl = (type) => new ElementBuilder(document.createElement(type));


    const xCoef = 1, xStep = 20;
    let translateY = (y) => y;

    function createChart(options) {
        const {el, chartData} = options;
        let {sizes} = options;
        sizes = sizes || {width: 500, height: 250};
        const {colors, columns, names, types} = chartData;
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
            //let yMin = Math.min(...visibleLines.map(l => Math.min(...l.slice(visibleIndexRange.from, visibleIndexRange.to + 1))));
            
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
            const [, xMax, yMin, yMax] = fullBounds;

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
            //const hGridTexts = [];
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
                const lId = columnIds[columnIndex], 
                    t = types[lId],
                    color = colors[lId],
                    c = columnsMap[lId];
                
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
                    .addClass('animate-opacity')
                    .appendTo(linesG);
                    
                    lineElements[lId] = p; 
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

            const toggleGroupEl = createEl('div').appendTo(el);
            const tg = new ToggleGroup({containerEl: toggleGroupEl.el, names});
            tg.onToogle = (lId) => toggleLine(lId);
        }
    
        const vertMatrix = (bounds) => {
            const fbyMax = state.fullBounds[3];
            const yMax = bounds[3];
            let yScale = state.sizes.height / yMax;
            const m1 = [1,0,0,1,0, yMax * yScale], m2 = [1,0,0, yScale,0,0], m3 =[1,0,0,1,0,-fbyMax];
            const vt = mul(m1, mul(m2, m3));
            const verticalTransform = 'matrix(' + vt[0] + ',' + vt[1] + ',' + vt[2] + ',' + vt[3] + ',' + vt[4] + ',' + vt[5] + ')';
            return verticalTransform;
        }

        const toggleLine = (lId) => {
            state.disabled[lId] = !state.disabled[lId];
            const lEl = state.elements.linesElements[lId];
            if(state.disabled[lId]) {
                lEl.addClass('disbled-line');
            } else {
                lEl.removeClass('disbled-line');
            }
            setRange(state.visibleRange, true);
        }

        const setRange = (range, force) => {
            
            range = range || {from: 0, to: 100};
            if(state.visibleRange.from == range.from && state.visibleRange.to == range.to && !force) return;
            
            const prevBounds = getBounds(state);

            state.visibleRange = range;
            
            const newBounds = getBounds(state);
            const [xMin, xMax, yMin, yMax] = newBounds;

            let xScale = state.sizes.width / xMax;
            let yScale = state.sizes.height / yMax;

            const dx = -xMin /*, dy = 0 /*-yMin*/;
                        
            //const oldVerticalTransform = vertMatrix(prevBounds);
            const verticalTransform = vertMatrix(newBounds);
            // if(oldVerticalTransform !== verticalTransform) {
            //     state.elements.linesGC.el.animate([{
            //         transform: oldVerticalTransform
            //     }, {
            //         transform: verticalTransform
            //     }], {
            //         duration: 150,
            //         easing: 'linear',
            //         direction: 'normal',
            //         fill: 'both'
            //     });
            // }

            const horizontalTransform = `matrix(1,0,0,1,${dx},0) matrix(${xScale},0,0,1,0,0)`;
            state.elements.linesGC.attr('transform', verticalTransform);
            state.elements.linesG.attr('transform', horizontalTransform);

            //state.elements.hGridLinesG.attr('transform', verticalTransform);

            if(prevBounds[2] !== yMin || prevBounds[3] !== yMax) {
                // update y axis lines
                //state.elements.hGridLinesG.attr('transform', 'none');
                const lc = 5;

                const newLines = calcYAxis(yScale, prevBounds, lc);
                // console.log('newLines', newLines);
                
                // TODO_create_elemts_pool!

                const gridElements = createYGridLines(newLines, (el) => el.style('opacity', '0.1'));
                const movedLines = calcYAxis(yScale, newBounds, lc);
                // console.log('movedLines', movedLines);
                setTimeout(() => {
                updateYGridLines(gridElements, movedLines, (el) => el.style('opacity', '1'));
                }, 0);
            }
        }

        const calcYAxis = (yScale, bounds, lc) => {
            const [, , yMin, yMax] = bounds;
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
                .attr('font-size', '10')
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

    class ToggleGroup {
        
        constructor(options) {
            const {names} = options;
            this.names = names;
            this.el = new ElementBuilder(options.containerEl);
            this.onToogle = () => {};
            this.init();
        }

        init() {
            this.el.addClass('chart-toogle-buttons');
            for (let k of Object.keys(this.names)) {
                let toggled = true;
                const n = this.names[k];
                const bEl = createEl('button')
                .addClass('button')
                .addClass('toggled')
                .innerText(n)
                .appendTo(this.el);

                bEl.el.onclick = () => {
                    toggled = !toggled;
                    if(toggled) {
                        bEl.addClass('toggled');
                    } else {
                        bEl.removeClass('toggled');
                    }
                    this.onToogle(k);
                };
            }
        }
    }

    g.createChart = createChart;

})(window);

