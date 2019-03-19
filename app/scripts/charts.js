(function (g) {

    const U = {
        keyBy: (a, f) => a.reduce((prev,el) => {
            const [p, v] = f(el);
            prev[p] = v;
            return prev;
        }, {})
    }

    const mmul = (m1, m2) => {
        return [
        m1[0] * m2[0] + m1[2] * m2[1],
        m1[1] * m2[0] + m1[3]* m2[1],
        m1[0] * m2[2] + m1[2] * m2[3],
        m1[1] * m2[2] + m1[3] * m2[3],
        m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
        m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
        ];
    }

    const pmul = (p, m) => {
        return [
            m[0] * p[0] + m[2] * p[1] + m[4],
            m[1]* p[0] + m[3] * p[1] + m[5]
          ]
    }

    const a2m = (m) => {
        return 'matrix(' + m[0] + ',' + m[1] + ',' + m[2] + ',' + m[3] + ',' + m[4] + ',' + m[5] + ')'
    }    

    const q = (cb)=> setTimeout(cb,0); 

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
        
        const xCoef = 1, xStep = 20;

        let state = {
            disabled: U.keyBy(chartColumnsIds, (id) => [id, false]),
            visibleRange: { from: 0, to: 100},
            aspectRatio: 2/1,
            elements: {
                linesElements: {},

            },
            transformY: (y) => y,
            transformYWithScale: (y) => y
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
            
            state.transformY = (y, s) => -(y - yMin) + yMax /* -yMin  */;    
            // see method vertMatrix
            //TODO use same matrices for chart view port and axes!
            state.transformYWithScale = (y, s) => (state.transformY(y) - yMax) * s  + s *  yMax; 
                
            const svgEl = createSVG('svg')
            .style('width', sizes.width)
            .style('height', sizes.height)
            .attr('viewBox', `${viewBox[0]} ${viewBox[1]} ${viewBox[2]} ${viewBox[3]}`)
            .attr('zoom', 1);
            
            const initalTransform = `matrix(${xScale}, 0, 0, ${yScale}, 0, 0)`;

            // Y axis
            const hGridLinesG =  createSVG('g')
            .addClass('animate-transform')
            .style('vector-effect', 'non-scaling-stroke')
            .appendTo(svgEl);

            const yAxis = new YAxis({containerEl: hGridLinesG.el});
            yAxis.updateRange(fullBounds, state);
            state.yAxis = yAxis;            
            
            state.elements.hGridLinesG = hGridLinesG;

            const columnIds = Object.keys(types);

            const bounds = fullBounds;
            const vm = vMatrix(bounds);
            const hm = hMatrix(bounds);

            const lineElements = {};
            const linesGC = createSVG('g')
            .addClass('animate-transform')
            .attr('transform', a2m(vm))
            .appendTo(svgEl);
            const linesG = createSVG('g')
            .attr('transform', a2m(hm))
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
                        d += state.transformY(c[pIdx]);
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
    
        const vMatrix = (bounds) => {
            const fbyMax = state.fullBounds[3];
            const yMax = bounds[3];
            let yScale = state.sizes.height / yMax;
            const m1 = [1,0,0,1,0, yMax * yScale], m2 = [1,0,0, yScale,0,0], m3 =[1,0,0,1,0,-fbyMax];
            const vt = mmul(m1, mmul(m2, m3));
            return vt;
        }

        const hMatrix = (bounds) => {
            const [xMin, xMax,] = bounds;
            let xScale = state.sizes.width / xMax;
            const dx = -xMin /*, dy = 0 /*-yMin*/;
            const m = mmul([1,0,0,1,dx,0], [xScale,0,0,1,0,0]);
            return m;
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

            const dx = -xMin /*, dy = 0 /*-yMin*/;
                        
            const vm = vMatrix(newBounds);
            const hm = hMatrix(newBounds);

            state.elements.linesGC.attr('transform', a2m(vm));
            state.elements.linesG.attr('transform', a2m(hm));

            if(prevBounds[2] !== yMin || prevBounds[3] !== yMax) {
                state.yAxis.updateRange(newBounds, state, vm);
            }
        }

        init();
    }

    class YAxis {
        
        constructor(options) {
            this.el = new ElementBuilder(options.containerEl);
            this.elementsCache = {};
            this.currentRangeKey = null;
            this.currentBounds = null;
        }

        updateRange(bounds, state, vm) {
            this.sizes = state.sizes;
            this.transformY = state.transformY;
            this.transformYWithScale = state.transformYWithScale;

            const [,,yMin,yMax] = bounds;
            const rKey = this.rangeToKey(yMin,yMax);
            if(this.currentRangeKey === rKey) return;
            
            let yScale = this.sizes.height / yMax;
            const lc = 5;
            if(!this.currentRangeKey) {
                const newLines = this.calcYAxis(yScale, bounds, lc, vm);
                const gridElements = this.createYGridLines(newLines, () => {});
                this.elementsCache[rKey] = gridElements;
            } else {
                const prevBounds = this.currentBounds;
                const prevYScale = this.sizes.height / prevBounds[3] /* yMax */;
                {
                    // move and hide lines
                    const gridElements = this.elementsCache[this.currentRangeKey];
                    //const newLines = this.calcYAxis(prevYScale, bounds, lc);
                    const newLines = this.calcYAxis(yScale, prevBounds, lc, vm);
                    q(() => {
                        //this.updateYGridLines(gridElements, newLines, (el) => el.style('opacity', '0'));
                        this.updateYGridLines(gridElements, newLines, () => {});
                    }, 0);
                }
                {
                    // move next lines
                    // const lc = 5;
                    // const newLines = calcYAxis(yScale, prevBounds, lc);
                    // const gridElements = this.elementsCache[this.currentRangeKey] || 
                    // createYGridLines(newLines, (el) => el.style('opacity', '0.1'));
                    // const movedLines = calcYAxis(yScale, newBounds, lc);
                    // // console.log('movedLines', movedLines);
                    // q(() => {
                    // updateYGridLines(gridElements, movedLines, (el) => el.style('opacity', '1'));
                    // }, 0);
                }
            }

            this.currentRangeKey = rKey;
            this.currentBounds = bounds;
        }

        rangeToKey(yMin, yMax) {
            return yMin + ':' + yMax;
        }

        calcYAxis(yScale, bounds, lc, vm) {
            const [, , yMin, yMax] = bounds;
            const lines = [];

            for(let i = 0;i<=lc;i++) {
                let yPoint = (yMax - yMin) / (lc + 1) * i;
                let y = 0;
                if(vm) {
                    const p = pmul([0,this.transformY(yPoint)], vm);
                    y = p[1];
                } else {
                    y = this.transformY(yPoint) * yScale;
                }
                
                lines.push({y: y, yGraph: yPoint, text: yPoint});
            }
            
            return lines;
        }        

        createYGridLines(lines, cb) {
            
            const hGridLines = [];
            const hGridTexts = [];
            
            const lc = lines.length;
            for(let i = 0;i < lc;i++) {
                let y = lines[i].y;
                const lEl = createSVG('path')
                .style('fill', 'none')
                .style('vector-effect', 'non-scaling-stroke')
                .attr('d',  'M0 0 L' + (this.sizes.width) +' 0')
                .attr('transform',  'matrix(1,0,0,1,0,' + y + ')')
                .addClass('chart-y-line')
                .addClass('animate-transform-opacity')
                .appendTo(this.el);
                hGridLines.push(lEl);
                cb(lEl);
    
                const tEl = createSVG('text')
                .attr('x',  '0')
                .attr('y',  '0')
                .attr('transform',  'matrix(1,0,0,1,0,' + (y - 5) + ')')
                .attr('font-family', 'sans-serif')
                .attr('font-size', '10')
                .attr('fill', 'gray')
                .textContent('' + lines[i].text)
                .addClass('animate-transform-opacity')
                .appendTo(this.el);
                hGridTexts.push(tEl);
                cb(tEl);
    
            }     
            return {hGridLines, hGridTexts};       
        }

        updateYGridLines(gridElements, lines, cb) {
            const {hGridLines, hGridTexts} = gridElements;
            const lc = lines.length;
            for(let i = 0; i < lc; i++) {
                let y = lines[i].y;
                
                hGridLines[i]
                .attr('d',  'M0 0 L' + (this.sizes.width) +' 0')
                .attr('transform',  'matrix(1,0,0,1,0,' + y + ')');
                cb(hGridLines[i]);
                
                hGridTexts[i]
                //.textContent('' + lines[i].text)
                .attr('transform',  'matrix(1,0,0,1,0,' + (y - 5) + ')');
                cb(hGridTexts[i]);
            }     
        }        

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

