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

    const pmulX = (x, m) => {
        return pmul([x,0], m)[0];
    }

    const pmulY = (y, m) => {
        return pmul([0,y], m)[1];
    }    

    const a2m = (m) => {
        return 'matrix(' + m[0] + ',' + m[1] + ',' + m[2] + ',' + m[3] + ',' + m[4] + ',' + m[5] + ')'
    }    

    const q = (cb)=> setTimeout(cb,0); 

    const getNavigatorLanguage = () => {
        if (navigator.languages && navigator.languages.length) {
          return navigator.languages[0];
        } else {
          return navigator.userLanguage || navigator.language || navigator.browserLanguage || 'en';
        }
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

    const xStep = 20;
   
    function createChart(options) {
        const {el, chartData} = options;
        let {sizes} = options;
        sizes = sizes || {width: 500, height: 250};
        const {colors, columns, names, types} = chartData;
        const chartColumnsIds = Object.keys(types).filter(t => types[t] !== 'x');
        const columnsMap = {};
        for(let c of columns) {
            columnsMap[c[0]] = c;
        }
        const xColumnId = Object.keys(types).find(t => types[t] === 'x');
        const xColumn = columnsMap[xColumnId];
        
        let state = {
            disabled: U.keyBy(chartColumnsIds, (id) => [id, false]),
            visibleRange: { from: 0, to: 100},
            aspectRatio: 2/1,
            elements: {
                linesElements: {},

            },
            transformY: (y) => y,
        };
   
        const getBounds = (s) => {
            // const ty = !!s;
            s = s || {
                disabled: {},
                visibleRange: { from: 0, to: 100}
            }
            
            const visibleLines = chartColumnsIds.filter(lid => !s.disabled[lid]).map(lid => columnsMap[lid]);

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
            const [, , yMin, yMax] = fullBounds;

            state.sizes = sizes;
            
            const xAxisHeight = 20;
            const svgWidth = sizes.width;
            const svgHeight = sizes.height + xAxisHeight;
            
            const viewBox = [ 0, 0, svgWidth, svgHeight];
            
            state.transformY = (y) => -(y - yMin) + yMax /* -yMin  */;    
            // see method vertMatrix
            //TODO use same matrices for chart view port and axes!
            
            const svgEl = createSVG('svg')
            .style('width', svgWidth)
            .style('height', svgHeight)
            .attr('viewBox', `${viewBox[0]} ${viewBox[1]} ${viewBox[2]} ${viewBox[3]}`)
            .attr('zoom', 1);

            const bounds = fullBounds;
            const vm = vMatrix(bounds);
            const hm = hMatrix(bounds);
            
            // Y axis
            const yAxisG =  createSVG('g')
            .addClass('animate-transform')
            .style('vector-effect', 'non-scaling-stroke')
            .appendTo(svgEl);
            state.elements.hGridLinesG = yAxisG;

            const yAxis = new YAxis({containerEl: yAxisG.el});
            yAxis.updateRange(fullBounds, state, vm);
            state.yAxis = yAxis;
            
            //X axis
            const xAxisG =  createSVG('g')
            .addClass('animate-transform')
            .appendTo(svgEl)
            .attr('transform', 'translate(0, ' + (state.sizes.height + xAxisHeight * 0.8 ) + ')');
            state.elements.xAxisG = xAxisG;            

            const xAxis = new XAxis({containerEl: xAxisG.el, xColumn: xColumn});
            xAxis.updateRange(fullBounds, state, hm);
            state.xAxis = xAxis;

            const columnIds = Object.keys(types);
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
                        d += (pIdx - 1) * xStep;
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

        // const beautyfyBounds = (bounds) => {
        //     // find nearest netural number divided to six OR 10, 50, 100
        //     return bounds;
        // }

        const setRange = (range, force) => {
            
            range = range || {from: 0, to: 100};
            if(state.visibleRange.from == range.from && state.visibleRange.to == range.to && !force) return;
            
            state.visibleRange = range;
            
            const newBounds = getBounds(state);

            const vm = vMatrix(newBounds);
            const hm = hMatrix(newBounds);

            state.elements.linesGC.attr('transform', a2m(vm));
            state.elements.linesG.attr('transform', a2m(hm));

            state.yAxis.updateRange(newBounds, state, vm);
            state.xAxis.updateRange(newBounds, state, hm);
        }

        init();
    }

    class XAxis {
        constructor(options) {
            this.el = new ElementBuilder(options.containerEl);
            this.xColumn = options.xColumn;
            this.elementsCache = {};
            this.currentRangeKey = null;
            this.currentBounds = null;
            this.textElements = [];
        }

        init(hm) {
            const xPoints = this.xColumn.slice(1);

            const userLang = getNavigatorLanguage();
            //const dateLabel = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const dateLabel = { month: 'short', day: 'numeric' };

            for(let i=0; i< xPoints.length;i++) {
                
                const labelText = new Date(xPoints[i]).toLocaleDateString(userLang, dateLabel);
                const x = i * xStep;

                const tEl = createSVG('text')
                .attr('x',  '0')
                .attr('y',  '0')
                .attr('transform', a2m([1,0,0,1,pmulX(x, hm),0]))
                .textContent('' + labelText)
                .addClass('chart-x-line-text')
                .addClass('animate-opacity')
                .appendTo(this.el);
                
                this.textElements.push({el: tEl, x: x});
            }            
        }

        finPowerTwo(n) {
            let v = 1;
            if(n <= v) return 1;
            for(let i = 0;i<32;i++) {
                if(n <= (v = 2**i)) return v;
            }
            return v; 
        }

        updateRange(bounds, state, hm) {
            if(this.textElements.length === 0) {
                this.init(hm);
            }

            // todo check same xscale!

            // eval visible labels
            const maxLabelInViewPort = Math.trunc(state.sizes.width / this.getLabelWidth ()); // todo some coef for padding
            const w = bounds[1] - bounds[0];
            const actualLabelInViewPort = w / xStep;
            const k = actualLabelInViewPort / maxLabelInViewPort;
            const visibleK = this.finPowerTwo(k);

            for(let i=0;i<this.textElements.length;i++) {
                
                const visible = ((i % visibleK) ==0) /*&& i !== 0 && i !== this.textElements.length - 1*/;
                this.textElements[i].el.attr('opacity', visible ? 1 : 0);

                this.textElements[i].el.attr('transform', a2m([1,0,0,1,pmulX(this.textElements[i].x, hm),0]));
            }

            this.currentHM = hm;
        }

        getLabelWidth() {
            // todo create tmp label and get getBoundClientRect
            return 5.5 * 10;
        }
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

            const [,,yMin,yMax] = bounds;
            const rKey = this.rangeToKey(yMin,yMax);
            if(this.currentRangeKey === rKey) return;
            
            const lc = 5;
            if(!this.currentRangeKey) {
                const newLines = this.calcYAxis(bounds, lc, vm);
                const gridElements = this.createYGridLines(newLines, () => {});
                this.elementsCache[rKey] = gridElements;
            } else {
                const prevBounds = this.currentBounds;
                {
                    // move and hide lines
                    const gridElements = this.elementsCache[this.currentRangeKey];
                    //const newLines = this.calcYAxis(bounds, lc);
                    const newLines = this.calcYAxis(prevBounds, lc, vm);
                    q(() => {
                        this.updateYGridLines(gridElements, newLines, (el) => el.style('opacity', '0'));
                        //this.updateYGridLines(gridElements, newLines, () => {});
                    }, 0);
                }
                {
                    const newLines = this.calcYAxis(bounds, lc, this.currentVM);
                    // TODO get elements from cache!
                    const gridElements = this.elementsCache[this.rKey] || 
                        this.createYGridLines(newLines, (el) => el.style('opacity', '0'));
                    const movedLines = this.calcYAxis(bounds, lc, vm);
                    this.elementsCache[rKey] = gridElements;
                    q(() => {
                    this.updateYGridLines(gridElements, movedLines, (el) => el.style('opacity', '1'));
                    }, 0);
                }
            }

            this.currentRangeKey = rKey;
            this.currentBounds = bounds;
            this.currentVM = vm;
        }

        rangeToKey(yMin, yMax) {
            return yMin + ':' + yMax;
        }

        prettyY(y) {
            return Math.round(y);
        }

        calcYAxis(bounds, lc, vm) {
            const [, , yMin, yMax] = bounds;
            const lines = [];

            for(let i = 0;i<=lc;i++) {
                let yPoint = (yMax - yMin) / (lc + 1) * i;
                yPoint = this.prettyY(yPoint);
                const y = pmulY(this.transformY(yPoint), vm);
                
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
                .addClass('chart-y-line-text')
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

