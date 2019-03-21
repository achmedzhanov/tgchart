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

    const maxSlice = (a, from, to) => Math.max(...a.slice(from, to + 1));

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

        on(name, h) {
            this._el.addEventListener(name, h, false);
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
        const {columns, names, types} = chartData;
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
        
        // TODO remove duplicated method!
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
            
            let yMax = Math.max(...visibleLines.map(l => maxSlice(l, visibleIndexRange.from, visibleIndexRange.to + 1)));
            
            const xSize = (xColumn.length - 2) * xStep;
            const xMin = xSize * s.visibleRange.from / 100;
            const xMax = xSize * s.visibleRange.to / 100;

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
            
            state.transformY = (y) => -(y - yMin) + yMax /* -yMin  */;    
            // see method vertMatrix
            //TODO use same matrices for chart view port and axes!

            const setSvgSizes = (svgElBuilder, w,h, p) => {
                const vb = [-p.left, - p.top, w+ p.right, h+ p.bottom];
                svgElBuilder
                .style('width', w + (p.left + p.right))
                .style('height', h + (p.left + p.bottom))
                .attr('viewBox', `${vb[0]} ${vb[1]} ${vb[2]} ${vb[3]}`);
                return svgElBuilder;
            }
            
            const svgEl = createSVG('svg')
            .attr('zoom', 1);
            setSvgSizes(svgEl, svgWidth, svgHeight, {left: 0, right: 0, top: 2, bottom: 2});

            // Y axis
            const yAxisG =  createSVG('g')
            .addClass('animate-transform')
            .style('vector-effect', 'non-scaling-stroke')
            .appendTo(svgEl);
            state.elements.hGridLinesG = yAxisG;
         
            //X axis
            const xAxisG =  createSVG('g')
            .addClass('animate-transform')
            .appendTo(svgEl)
            .attr('transform', 'translate(0, ' + (state.sizes.height + xAxisHeight * 0.8 ) + ')');
            state.elements.xAxisG = xAxisG;            

            const cvp = new ChartViewPort({ containerEl: svgEl.el, chartData: chartData, sizes: state.sizes });
            cvp.init();
            state.cvp = cvp;
            

            const xAxis = new XAxis({containerEl: xAxisG.el, xColumn: xColumn});
            state.xAxis = xAxis;            

            const yAxis = new YAxis({containerEl: yAxisG.el});
            state.yAxis = yAxis;

            cvp.onChangeTransformations = (({bounds, vm, hm}) => {
                xAxis.updateRange(bounds, state, hm);
                yAxis.updateRange(bounds, state, vm);
            });
            cvp.updateRange({from: 0, to: 100}, true);
            
            svgEl.appendTo(el);

            const miniMapHeight = 30;
            const miniMapBlockEl = createEl('div').addClass('chart-range-selector').appendTo(el);
            const miniMapEl = createSVG('svg').appendTo(miniMapBlockEl);
            
            setSvgSizes(miniMapEl, state.sizes.width, miniMapHeight, {left: 0, right: 0, top: 2, bottom: 2});

            const miniCVP = new ChartViewPort({ 
                containerEl: miniMapEl.el, 
                chartData: chartData, 
                sizes: { width: state.sizes.width, height: miniMapHeight},
                strokeWidth: '1px'
            });
            miniCVP.init();
            state.miniCVP = miniCVP;
            miniCVP.updateRange({from: 0, to: 100}, true)

            const rangeSelector = new RangeSelector({range: {from: 50, to: 75}, containerEl: miniMapBlockEl.el});
            rangeSelector.init();

            // create svg, create lines

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
                cvp.updateRange({from: 0, to: val});
            };
            sliderEl.onchange = onSliderChange;
            sliderEl.oninput = onSliderChange;

            el.appendChild(sliderEl);

            const toggleGroupEl = createEl('div').appendTo(el);
            const tg = new ToggleGroup({containerEl: toggleGroupEl.el, names});
            tg.onToogle = (lId) => toggleLine(lId);
        }
       
        const toggleLine = (lId) => {
            state.cvp.toggleLine(lId);
            state.miniCVP.toggleLine(lId);
        }

        // const beautyfyBounds = (bounds) => {
        //     // find nearest netural number divided to six OR 10, 50, 100
        //     return bounds;
        // }

        init();
    }

    class ChartViewPort {
        constructor(options) {
            this.el = new ElementBuilder(options.containerEl);
            this.chartData = options.chartData;
            this.sizes = options.sizes;
            this.strokeWidth = options.strokeWidth || 2;
            this.disabled = {};
            this.visibleRange = {from: 0, to: 100};

            if(!this.sizes) throw new 'Expected options.sizes';

            this.onChangeTransformations = ()=> {};
        }

        init() {

            const {colors, columns, types} = this.chartData;
            const columnsMap = this.columnsMap = {};
            for(let c of columns) {
                columnsMap[c[0]] = c;
            }
            this.chartColumnsIds = Object.keys(types).filter(t => types[t] !== 'x');
            const columnIds = Object.keys(types);
            this.xColumnId = Object.keys(types).find(t => types[t] === 'x');
            this.xColumn = columnsMap[this.xColumnId];
            this.fullBounds = this.getBounds({from:0, to: 100});

            const lineElements = {};
            const linesGC = createSVG('g')
            .addClass('animate-transform')
            //.attr('transform', a2m(vm))
            .appendTo(this.el);
            const linesG = createSVG('g')
            //.attr('transform', a2m(hm))
            .appendTo(linesGC);

            const [,, yMin, yMax] = this.fullBounds;
            const transformY = (y) => -(y - yMin) + yMax /* -yMin  */;
            
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
                        d += transformY(c[pIdx]);
                    }
                    const p =createSVG('path')
                    .attr('d', d)
                    .style('stroke', color)
                    .style('stroke-width', this.strokeWidth)
                    .style('vector-effect', 'non-scaling-stroke')
                    .style('fill', 'none')
                    .addClass('animate-opacity')
                    .appendTo(linesG);
                    
                    lineElements[lId] = p; 
                } 
            }

            this.linesElements = lineElements;
            this.linesGC = linesGC;
            this.linesG = linesG;
        }

        vMatrix(bounds) {
            const fbyMax = this.fullBounds[3];
            const yMax = bounds[3];
            let yScale = this.sizes.height / yMax;
            const m1 = [1,0,0,1,0, yMax * yScale], m2 = [1,0,0, yScale,0,0], m3 =[1,0,0,1,0,-fbyMax];
            const vt = mmul(m1, mmul(m2, m3));
            return vt;
        }
        
        hMatrix(bounds) {
            const [xMin, xMax,] = bounds;
            let xScale = this.sizes.width / xMax;
            const dx = -xMin /*, dy = 0 /*-yMin*/;
            const m = mmul([1,0,0,1,dx,0], [xScale,0,0,1,0,0]);
            return m;
        }

        getBounds(range) {
            range = range || { from: 0, to: 100};
            const visibleLines = this.chartColumnsIds.filter(lid => !this.disabled[lid]).map(lid => this.columnsMap[lid]);

            const visibleIndexRange = {
                from: 1 + (this.xColumn.length - 1) * this.visibleRange.from / 100,
                to: (this.xColumn.length - 1) * this.visibleRange.to / 100
            };
            
            let yMax = Math.max(...visibleLines.map(l => maxSlice(l, visibleIndexRange.from, visibleIndexRange.to + 1)));
            //let yMin = Math.min(...visibleLines.map(l => Math.min(...l.slice(visibleIndexRange.from, visibleIndexRange.to + 1))));
            
            const xSize = (this.xColumn.length - 2) * xStep;
            const xMin = xSize * range.from / 100;
            const xMax = xSize * range.to / 100;

            return [xMin, xMax, 0 /*yMin*/, yMax];
        }

        updateRange(range, force) {
            
            range = range || {from: 0, to: 100};
            
            if(this.visibleRange.from == range.from && this.visibleRange.to == range.to && !force) return;
            
            this.visibleRange = range;
            
            const newBounds = this.getBounds(range);
    
            const vm = this.vMatrix(newBounds);
            const hm = this.hMatrix(newBounds);
    
            this.linesGC.attr('transform', a2m(vm));
            this.linesG.attr('transform', a2m(hm));

            this.onChangeTransformations({bounds: newBounds, vm, hm});
        }

        toggleLine(lId)  {
            this.disabled[lId] = !this.disabled[lId];
            const lEl = this.linesElements[lId];
            if(this.disabled[lId]) {
                lEl.addClass('disbled-line');
            } else {
                lEl.removeClass('disbled-line');
            }
            this.updateRange(this.visibleRange, true);
        }
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

            this.textElements = new Array(xPoints.length);

            const userLang = getNavigatorLanguage();
            //const dateLabel = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const dateLabel = { month: 'short', day: 'numeric' };

            this.getOrCreateTextEl = (i) =>  {
                
                if(this.textElements[i]) return this.textElements[i];

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
                
                const v = {el: tEl, x: x};

                this.textElements[i] = v;

                return v;
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
                const isLabelInsideBouds = bounds[0] <= i * xStep && i * xStep <= bounds[1];
                let elHolder = visible && isLabelInsideBouds ? this.getOrCreateTextEl(i) : this.textElements[i];
                if(elHolder) {
                    elHolder.el.attr('opacity', visible ? 1 : 0);
                    elHolder.el.attr('transform', a2m([1,0,0,1,pmulX(elHolder.x, hm),0]));
                }
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

    function dnd(e, ondnd, data) {
        const startEvent = e;
        const fireDndEvent = (mme, last) => {
            const delta = {
                x: mme.clientX - startEvent.clientX,
                y: mme.clientY - startEvent.clientY
            };
            const dndEvent = {
                mme: mme,
                delta: delta,
                data: data,
                finished: last
            };
            ondnd(dndEvent);
        }
        const onMouseMove = (mme) => {
            if(finished) return;
            fireDndEvent(mme, false);
        };
        const onMouseUp = (mme) => {
            if(finished) return;
            fireDndEvent(mme, true);
            finish();
        };
        let finished = false;
        const finish = () => {
            finished = true;
            document.removeEventListener('pointermove', onMouseMove);
            document.removeEventListener('pointerup', onMouseUp);
        };
        document.addEventListener('pointermove', onMouseMove);
        document.addEventListener('pointerup', onMouseUp);
    }

    function limit(v, min, max) {
        if(v > max) return max;
        if(v < min) return min;
        return v;
    }

    class RangeSelector {
        constructor(options) {
            this.range = options.range || {from:0,  to: 100};
            this.width = options.width;
            this.minRamgeWidth = options.minRamgeWidth || 5;
            this.el = new ElementBuilder(options.containerEl);
            this.onRangeChanged = () => {};
        }

        init() {
            this.leftCurtainEl = createEl('div').addClass('left-curtain').appendTo(this.el);
            this.rightCurtainEl = createEl('div').addClass('right-curtain').appendTo(this.el);
            this.leftGripperEl = createEl('div').addClass('left-gripper').appendTo(this.el);
            this.rightGripperEl = createEl('div').addClass('right-gripper').appendTo(this.el);
            this.sliderEl = createEl('div').addClass('slider').appendTo(this.el);

            // use pointer events???

            this.sliderEl.on('pointerdown', (e) => this.onSliderMouseDown(e));
            this.leftGripperEl.on('pointerdown', (e) => this.onLeftGripperMouseDown(e));
            this.rightGripperEl.on('pointerdown', (e) => this.onRightGripperMouseDown(e));
            this.positionByRange();
        }
        positionByRange() {
            const w = this.el.el.getBoundingClientRect().width;
            const leftPos = Math.round(w * this.range.from / 100);
            const rightPos = Math.round(w * (this.range.to) / 100);
            this.state = {leftPos, rightPos, w};
            this.updateElementsByState();
        }
        updateElementsByState() {
            const leftPos = this.state.leftPos;
            const rightPos = this.state.rightPos;
            const w = this.state.w;
            const width = rightPos - leftPos;
            
            this.sliderEl.style('left', leftPos + 'px');
            this.sliderEl.style('width', width + 'px');
            this.leftGripperEl.style('left', leftPos + 'px');
            this.rightGripperEl.style('right', (w - rightPos) + 'px');
            this.leftCurtainEl.style('width', leftPos + 'px');
            this.rightCurtainEl.style('width', (w - rightPos) + 'px');
        }        
        getWidth() {
            return this.el.el.getBoundingClientRect().width;
        }
        cloneState() {
            return {leftPos: this.state.leftPos, rightPos: this.state.rightPos, w: this.state.w};
        }        
        onSliderMouseDown(e) {
            event.preventDefault();
            event.stopImmediatePropagation();
            const w = this.getWidth();
            const startState = this.cloneState();
            const minWidth = this.minRamgeWidth / 100 * w;
            const sliderWidth = Math.max(startState.rightPos - startState.leftPos, minWidth);
            dnd(e, (dndEvent) => {
                const leftPos = limit(startState.leftPos + dndEvent.delta.x, 0, w - sliderWidth);
                const rightPos = leftPos + sliderWidth;
                this.state = {...this.state, leftPos, rightPos};
                this.updateElementsByState();
            });
        }
        onLeftGripperMouseDown(e) {
            event.preventDefault();
            event.stopImmediatePropagation();
            const w = this.getWidth();
            const startState = this.cloneState();
            const minWidth = this.minRamgeWidth / 100 * w;
            dnd(e, (dndEvent) => {
                const leftPos = limit(startState.leftPos + dndEvent.delta.x, 0, startState.rightPos - minWidth);
                this.state = {...this.state, leftPos};
                this.updateElementsByState();
            });
        }
        onRightGripperMouseDown(e) {
            event.preventDefault();
            event.stopImmediatePropagation();
            const w = this.getWidth();
            const startState = this.cloneState();
            const minWidth = this.minRamgeWidth / 100 * w;
            dnd(e, (dndEvent) => {
                const rightPos = limit(startState.rightPos + dndEvent.delta.x, startState.leftPos + minWidth, w);
                this.state = {...this.state, rightPos};
                this.updateElementsByState();
            });
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

