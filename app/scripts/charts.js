(function (g) {

    //console.log = ()=> {};

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

    const mequals = (m1, m2) => {
        return !!m1 && !!m2 && m1[0] === m2[0] && m1[1] === m2[1] && m1[2] === m2[2] 
            && m1[3] === m2[3] && m1[4] === m2[4] && m1[5] === m2[5];
    }

    const minverse = (m) => {
        let d = m[0] * m[3] - m[1] * m[2];
        return {
          0: m[3] / d,
          1: m[1] / -d,
          2: m[2] / -d,
          3: m[0] / d,
          4: (m[3] * m[4] - m[2] * m[5]) / -d,
          5: (m[1] * m[4] - m[0] * m[5]) / d
        };
    } 

    const pmul = (p, m) => {
        return [
            m[0] * p[0] + m[2] * p[1] + m[4],
            m[1]* p[0] + m[3] * p[1] + m[5]
          ]
    }

    const pmulX = (x, m) => {
        return m[0] * x + m[4];
    }

    const pmulY = (y, m) => {
        return m[3] * y + m[5];
    }    

    const maxSlice = (a, from, to) => Math.max(...a.slice(from, to + 1));

    const a2m = (m) => {
        return 'matrix(' + m[0] + ',' + m[1] + ',' + m[2] + ',' + m[3] + ',' + m[4] + ',' + m[5] + ')'
    }    

    const q = (cb)=> setTimeout(cb,0); 

    // function throttle (cb, duration) {
    //     let wait = false;
    //     return function () {
    //         if (!wait) {
    //             cb.apply(null, arguments);
    //             wait = true;
    //             setTimeout(function () { wait = false; }, duration);
    //         }
    //     }
    // }    

    const getNavigatorLanguage = () => {
        if (navigator.languages && navigator.languages.length) {
          return navigator.languages[0];
        } else {
          return navigator.userLanguage || navigator.language || navigator.browserLanguage || 'en';
        }
    }

    // const linear = (t) => t;
    const easeInQuad = function (t) { return t*t };
    const animationsMap = {};
    //let aIdSource = 0;
    const animateSteps = (options) => {
        let {key, range, duration, ease, step, onCancel, onFinish} = options;
        //console.log('animateSteps', options);
        //const aId = ++aIdSource;
        ease = ease || easeInQuad;
        range = range || {from: 0, to: 1};
        duration = duration || 300;
        //console.log('animate/new' + '\t\t\t\t#' + aId );
        if(key && animationsMap[key]) {
            //console.log('animate/cancel' + '\t\t\t\t#' + aId );
            cancelAnimationFrame(animationsMap[key]);
            onCancel && onCancel();
            animationsMap[key] = undefined;
        }
        // TODO use performnce.now instead of new Date ???
        let startTime = new Date();
        const a = () => {
            let p = (new Date() - startTime) / duration;
            if(p >= 1) p = 1;
            //console.log('\tanimate/if' + '\t\t\t#' + aId , p);
            const v = range.from + (range.to - range.from) * ease(p);
            //console.log('as/t\t\t\t\t\t\t\t\t\t', v, p, performance.now());
            if(p >= 1) {
                //console.log('\t\tanimate/finish' + '\t#' + aId , p);
                onFinish && onFinish(v);
            } else {
                //console.log('\t\tanimate/step' + '\t#' + aId , p);
                step(v);
                const rId = requestAnimationFrame(a);
                if(key) animationsMap[key] = rId;
            }
        };
        const rId = requestAnimationFrame(a);
        if(key) animationsMap[key] = rId;
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

        innerHTML(value) {
            this._el.innerHTML = value;
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
    
        do(cb) {
            if(cb) {
                cb(this);
            }
            return this;
        }

        get el() {
            return this._el;
        }
    }

    class BehaviorSubject {
        constructor(initialValue) {
            this.value = initialValue;
            this.handlers = [];
        }
        subscribe(h, skipCurrent) {
            !skipCurrent && h(this.value);
            this.handlers.push(h);
        }
        next(v) {
            this.value = v;
            for(let h of this.handlers) {
                h(v);
            }
        }
        getValue() {
            return this.value;
        }
    }

    const bs = (initialValue) => {
        const subject = new BehaviorSubject(initialValue);
        const r = (h, skip) => {
            subject.subscribe(h, skip);
        };
        r.next = (v) => subject.next(v);
        r.subscribe = (h, skip) => subject.subscribe(h, skip);
        r.getValue = () => subject.getValue();
        return r;
    };

    const mapbs = (source, mapFn) => {
        const subject = bs(mapFn(source.getValue()));
        source.subscribe((v) => subject.next(mapFn(v)), true);
        return subject;
    }

    let optimizedSVGTransformations = false;

    const createSVG = (type) => new ElementBuilder(document.createElementNS('http://www.w3.org/2000/svg', type));
    const createEl = (type) => new ElementBuilder(document.createElement(type));

    const xStep = 20;
   
    function createChart(options) {
        const {el, chartData, title} = options;
        let {size} = options;
        const {columns, names, types, colors} = chartData;
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

        const getSizeFromEl = (el) => {
            const isLandscape = window.innerHeight > window.innerWidth;
            const width = el.offsetWidth || 500;
            let aspectRatio = 1;
            if(window.innerHeight && window.innerWidth) {
                aspectRatio = window.innerHeight / window.innerWidth * 0.7;
            }

            return {width: width, height: isLandscape ?  width : width * aspectRatio};
        }
        
        const xAxisHeight = 20;
        const viewPortPaddings = {left: 0, right: 0, top: 2, bottom: 2};
        const calcSizes = (size) => {
            const viewPortSize = { 
                width: size.width - viewPortPaddings.left - viewPortPaddings.right, 
                height: size.height - viewPortPaddings.top - viewPortPaddings.bottom - xAxisHeight
            };            
            const svgSize = { 
                width: size.width, 
                height: size.height
            };
            return {viewPortSize, svgSize};
        }


        const init = () => {
            if(title) {
                createEl('div').addClass('title').innerText(title).appendTo(el);
            }
            const svgElC = createEl('div').addClass('chart-view-port').style('position', 'relative').appendTo(el);
            if(!size) {
                size = getSizeFromEl(el); 
            }
            state.size = size;            
            const initialSizes = calcSizes(size);
            // TODO remove sizes fields from state!
            state.viewPortSize = initialSizes.viewPortSize;
            state.svgSize = initialSizes.svgSize;

            const sizes$ = bs(initialSizes);
            const sizeViewPort$ = mapbs(sizes$, (s)=>s.viewPortSize);
            window.addEventListener('resize', () => {
                const updatedSizes = calcSizes(getSizeFromEl(el));
                // console.log('resize', updatedSizes);
                sizes$.next(updatedSizes);
            });


            const fullBounds = getBounds(null);
            state.fullBounds = fullBounds;
            const [, , yMin, yMax] = fullBounds;

            state.transformY = (y) => -(y - yMin) + yMax /* -yMin  */;    
            // see method vertMatrix
            //TODO use same matrixes for chart view port and axes!

            const sizeSVG = (svgElBuilder, s, p) => {
                const w = s.width;
                const h = s.height;
                p = p || {left: 0, right: 0, top: 2, bottom: 2};
                const vb = [-p.left, - p.top, w - (p.right ), h - (p.bottom)];
                
                svgElBuilder
                .style('width', w)
                .style('height', h)
                .attr('viewBox', `${vb[0]} ${vb[1]} ${vb[2]} ${vb[3]}`);
                return svgElBuilder;
            }
           
            const viewPortBackdropEl = createEl('div')
            .do((b) => {
                sizes$((s) => {
                    b
                    .style('width', s.viewPortSize.width + 'px')
                    .style('height', s.viewPortSize.height + 'px');
                })
            })
            .style('left', viewPortPaddings.left + 'px')
            .style('top', viewPortPaddings.top + 'px')
            .style('position', 'absolute').appendTo(svgElC);

            const svgEl = createSVG('svg')
            .attr('zoom', 1);
            sizes$((s)=> {
                sizeSVG(svgEl, s.svgSize, viewPortPaddings);
            })

            // Y axis
            const yAxisG =  createSVG('g')
            .addClass('animate-transform')
            .style('vector-effect', 'non-scaling-stroke')
            .appendTo(svgEl);
            state.elements.hGridLinesG = yAxisG;
         
            //X axis
            const xAxisG =  createSVG('g')
            .addClass('animate-transform')
            .appendTo(svgEl);
            sizes$((s) => xAxisG.attr('transform', 'translate(0, ' + (s.viewPortSize.height + xAxisHeight * 0.8 ) + ')'));

            state.elements.xAxisG = xAxisG;            
            
            const initialRange = {from: 50, to: 75};

            const cvp = new ChartViewPort({ 
                containerEl: svgEl.el, 
                chartData: chartData, 
                size$: sizeViewPort$,
                range: initialRange
            });
            cvp.init();
            state.cvp = cvp;

            this.viewPortEl = new ElementBuilder(options.viewPortEl);
            this.viewPort = options.viewPort;

            const cph = new ChartsTooltip({viewPortEl: cvp.linesGC.el, hoverContainerEl: cvp.hoverContainerG.el, 
                viewPort: cvp, viewPortBackdropEl: viewPortBackdropEl.el, size$: sizeViewPort$});
            cph.init();
            state.cph = cph;

            const xAxis = new XAxis({containerEl: xAxisG.el, xColumn: xColumn});
            state.xAxis = xAxis;

            const yAxis = new YAxis({containerGEl: yAxisG.el, containerDivEl: viewPortBackdropEl.el, viewPort: cvp, size$: sizeViewPort$});
            state.yAxis = yAxis;

            cvp.onChangeTransformations = (({bounds, vm, hm}) => {
                xAxis.updateRange(bounds, state, hm);
                yAxis.updateRange(bounds, vm);
            });
            cvp.updateRange(initialRange, true);
           
            svgEl.appendTo(svgElC);

            const miniMapViewPortHeight = 30;
            const miniMapBlockEl = createEl('div').addClass('chart-range-selector').appendTo(el);
            sizes$((s)=>miniMapBlockEl.style('width', s.viewPortSize.width + 'px'))
            const miniMapEl = createSVG('svg').appendTo(miniMapBlockEl);
            
            const minimapPaddings = {left: 0, right: 0, top: 2, bottom: 2};
            const minimapSVGHeight = miniMapViewPortHeight + minimapPaddings.top + minimapPaddings.bottom;
            sizes$((s) => sizeSVG(miniMapEl, {width: s.viewPortSize.width, height: minimapSVGHeight}, minimapPaddings));

            const miniCVP = new ChartViewPort({ 
                containerEl: miniMapEl.el, 
                chartData: chartData, 
                size$: mapbs(sizeViewPort$, (s) => { return { width: s.width, height: miniMapViewPortHeight };} ),
                strokeWidth: '1px',
                range: {from: 0, to: 100}
            });
            miniCVP.init();
            state.miniCVP = miniCVP;
            miniCVP.updateRange({from: 0, to: 100}, true)

            const minRangeWidth =  Math.max(2 / (xColumn.length - 1) * 100, (1 / state.viewPortSize.width) * 100, 5);
            const rangeSelector = new RangeSelector({
                range: initialRange, 
                containerEl: miniMapBlockEl.el, 
                minRangeWidth: minRangeWidth, 
                width$: mapbs(sizeViewPort$, (s) => s.width)
            });
            rangeSelector.init();
            rangeSelector.onRangeChanged = (r) => { cph.hide(); cvp.updateRange(r); };

            const toggleGroupEl = createEl('div').appendTo(el);
            const tg = new ToggleGroup({containerEl: toggleGroupEl.el, names, colors});
            tg.onToogle = (lId) => {cph.hide(); toggleLine(lId);}

            el['__chart_state__'] = state;
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

    let chartViewPortUidSource = 0;
    class ChartViewPort {
        constructor(options) {
            this.uid = ++chartViewPortUidSource;
            this.animationUidKey = 'chart-view-port-' + this.uid;
            this.el = new ElementBuilder(options.containerEl);
            this.chartData = options.chartData;
            this.size$ = options.size$;
            this.size$((s) => this.updateSize(s), true);
            this.size = this.size$.getValue();
            this.strokeWidth = options.strokeWidth || 2;
            this.disabled = {};
            this.visibleRange = options.range || {from: 0, to: 100};

            if(!this.size$) throw new 'Expected options.size$';

            this.onChangeTransformations = ()=> {};
            this.commitMarkupB = () => this.commitMarkup();
        }

        init() {

            const {colors, columns, types, names} = this.chartData;
            const columnsMap = this.columnsMap = {};
            const colorsMap = this.colorsMap = {};
            for(let c of columns) {
                columnsMap[c[0]] = c;
                colorsMap[c[0]] = colors[c[0]];
            }
            this.chartColumnsIds = Object.keys(types).filter(t => types[t] !== 'x');
            const columnIds = Object.keys(types);
            this.xColumnId = Object.keys(types).find(t => types[t] === 'x');
            this.xColumn = columnsMap[this.xColumnId];
            this.fullBounds = this.getBounds({from:0, to: 100});
            this.names = names;
            const linesElements = {};
            const linesGC = createSVG('g')
            .appendTo(this.el);

            if(optimizedSVGTransformations) {
                linesGC.addClass('animate-transform');
            }

            const linesG = createSVG('g')
            .appendTo(linesGC);

            const hoverContainerG = createSVG('g')
            .appendTo(this.el);
            this.hoverContainerG = hoverContainerG;

            const [,, yMin, yMax] = this.fullBounds;
            const transformY = (y) => -(y - yMin) + yMax /* -yMin  */;
            this.transformY = transformY;
            
            for (let columnIndex = 0; columnIndex< columnIds.length; columnIndex++) {
                const lId = columnIds[columnIndex], 
                    t = types[lId],
                    color = colors[lId],
                    c = columnsMap[lId];
                
                if (t === 'line') {
                    let d = '';
                    
                    if(optimizedSVGTransformations) {
                        for(let pIdx = 1; pIdx < c.length; pIdx++) {
                            d += (pIdx == 1 ? 'M' : 'L');
                            d += (pIdx - 1) * xStep;
                            d += ' ';
                            d += transformY(c[pIdx]);
                        }
                    }

                    const p =createSVG('path')
                    .addClass('chart-line')
                    .attr('d', d)
                    .style('stroke', color)
                    .style('stroke-width', this.strokeWidth)
                    .style('vector-effect', 'non-scaling-stroke')
                    .style('fill', 'none')
                    .addClass('animate-opacity')
                    .appendTo(linesG);
                    
                    linesElements[lId] = p; 
                } 
            }

            this.linesElements = linesElements;
            this.linesGC = linesGC;
            this.linesG = linesG;
        }

        updateSize(s) {
            if(!s.width || !s.height) throw 'Excpected {width, height}';
            this.size = s;
            this.markupState = null;
            this.currentTransformations = null;
            this.updateRange( this.visibleRange, true);
        }

        vMatrix(bounds) {
            const fbyMax = this.fullBounds[3];
            const yMax = bounds[3];
            let yScale = this.size.height / yMax;
            const m1 = [1,0,0,1,0, yMax * yScale], m2 = [1,0,0, yScale,0,0], m3 =[1,0,0,1,0,-fbyMax];
            const vt = mmul(m1, mmul(m2, m3));
            return vt;
        }
        
        hMatrix(bounds) {
            const [xMin, xMax,] = bounds;
            let xScale = this.size.width / (xMax - xMin);
            const m2 = [xScale,0,0,1,0,0], m3 = [1,0,0,1, -xMin,0];
            const m = mmul(m2, m3);
            return m;
        }

        getAllLinesIds() {
            return this.chartColumnsIds;
        }        

        getEnabledLinesIds() {
            return this.chartColumnsIds.filter(lid => !this.disabled[lid]);
        }

        getDisabledLinesIds() {
            return this.chartColumnsIds.filter(lid => this.disabled[lid]);
        }

        getEnabledLines() {
            return this.getEnabledLinesIds().map(lid => this.columnsMap[lid]);
        }

        getBounds(range) {
            range = range || { from: 0, to: 100};
            const visibleLines = this.getEnabledLines();

            const visibleIndexRange = {
                from: 1 + (this.xColumn.length - 1) * range.from / 100,
                to: (this.xColumn.length - 1) * range.to / 100
            };
            
            let yMax = visibleLines.length > 0 ? 
                Math.max(...visibleLines.map(l => maxSlice(l, visibleIndexRange.from, visibleIndexRange.to + 1))):
                this.fullBounds[3];
            //let yMin = Math.min(...visibleLines.map(l => Math.min(...l.slice(visibleIndexRange.from, visibleIndexRange.to + 1))));
            
            const xSize = (this.xColumn.length - 2) * xStep;
            const xMin = xSize * range.from / 100;
            const xMax = xSize * range.to / 100;

            return [xMin, xMax, 0 /*yMin*/, yMax];
        }

        requestUpdate(u) {
            // if(this.lastUpdate) { 
            //     console.log('requestUpdate/cancelAnimationFrame'); 
            //     cancelAnimationFrame(this.lastUpdate); 
            //     this.lastUpdate = null;
            // }

            // TODO spawn render from setTimeout(1000/6), not raf

            this.lastUpdate = requestAnimationFrame(() => {
                //console.log('requestUpdate/update', performance.now()); 
                u();
                this.lastUpdate = null;
            });
        }

        requestCommit(s) {
            //console.log('request yScale', s.yScale);
            this.markupState = s;
            this.requestUpdate(this.commitMarkupB);
        }

        updateRange(range, force) {
            
            range = range || {from: 0, to: 100};
            if(this.visibleRange.from == range.from && this.visibleRange.to == range.to && !force) return;
            this.visibleRange = range;
            
            const newBounds = this.getBounds(range);
    
            const vm = this.vMatrix(newBounds);
            const hm = this.hMatrix(newBounds);
    
            if(optimizedSVGTransformations) {
                this.linesGC.attr('transform', a2m(vm));
                this.linesG.attr('transform', a2m(hm));
            } else {
                const oldBounds = this.currentTransformations ? this.currentTransformations.bounds : null; 

                const [xMin, xMax, yMin, yMax] = newBounds;
                let xScale = this.size.width / (xMax - xMin);
                let yScale = this.size.height / yMax;
               
                if(!oldBounds || !this.markupState) {
                    this.requestCommit({xMin, xMax, yMin, yMax, xScale, yScale});
                } else {
                    if(this.currentTransformations.bounds[2] != newBounds[2] || 
                        this.currentTransformations.bounds[3] != newBounds[3]) {
                            
                            // TODO adapt duration to scale difference
                            const duration = 200; 
                            animateSteps({
                                key: this.animationUidKey, 
                                range: {from: this.markupState.yScale, to: yScale}, 
                                duration: duration, step: (yScale)=> {
                                    this.requestCommit({...this.markupState, yScale});
                                }, onFinish: (yScale)=> {
                                    this.requestCommit({...this.markupState, yScale});
                                } 
                            });                            
                    } 
                    
                    this.requestCommit({...this.markupState, xMin, xMax, xScale});
                }
            }
            // todo merge hm & vm
            this.onChangeTransformations({bounds: newBounds, vm, hm});
            this.currentTransformations = {bounds: newBounds, vm, hm};
        }

        vMatrixByScale(yScale) {
            const fbyMax = this.fullBounds[3];
            const yMax = this.size.height / yScale;
            const m1 = [1,0,0,1,0, yMax * yScale], m2 = [1,0,0, yScale,0,0], m3 =[1,0,0,1,0,-fbyMax];
            const vt = mmul(m1, mmul(m2, m3));
            return vt;
        }        

        commitMarkup() {
            const {xMin, yScale, xScale} =  this.markupState;
            if(xMin === undefined) throw 'xMin';
            if(xScale === undefined) throw 'xScale';
            if(yScale === undefined) throw 'yScale';

            //console.log('cimmit yScale', yScale);

            const commitedMarkeupState = this.commitedMarkupState
            if(!commitedMarkeupState || yScale != commitedMarkeupState.yScale || xScale != commitedMarkeupState.xScale) {
                const vm  = this.vMatrixByScale(yScale);
                const visibleLinesIds = this.getAllLinesIds();
                for (let lId of visibleLinesIds) {
                    // todo check lines opacity!
                    const c = this.columnsMap[lId];
                    let d = '';
                    for(let pIdx = 1; pIdx < c.length; pIdx++) {
                        d += (pIdx == 1 ? 'M' : 'L');
                        d += ((pIdx - 1) * xStep) * xScale;
                        d += ' ';
                        d += pmulY(this.transformY(c[pIdx]), vm);
                    }
                    this.linesElements[lId].attr('d', d);
                }                
            }
            this.linesG.attr('transform', 'translate(' + -xMin * xScale + ', 0)');
            this.commitedMarkeupState = this.markupState;
        }

        toggleLine(lId)  {
            const disabled = !this.disabled[lId];
            const lEl = this.linesElements[lId];
            if(disabled) {
                lEl.addClass('disabled-line');
            } else {
                lEl.removeClass('disabled-line');
            }
            // if(optimizedSVGTransformations) {
                this.disabled[lId] = disabled;
                this.updateRange(this.visibleRange, true);
            // } else {
            //     animateSteps  todo
            // }
        }
    }

    class ChartsTooltip {
        constructor(options) {
            this.viewPortEl = new ElementBuilder(options.viewPortEl);
            this.hoverContainerEl = new ElementBuilder(options.hoverContainerEl);
            this.viewPortBackdropEl = new ElementBuilder(options.viewPortBackdropEl);
            this.viewPort = options.viewPort;
            this.size$ = options.size$;
            this.size$(()=>this.hide(), true);
            this.isCreatedElements = false;
            this.circleElementsMap = {};
            this.circleElements = [];
        }

        init() {
            this.viewPortBackdropEl.on('click', (e )=> {this.onViewPortClick(e)});
            this.viewPortBackdropEl.on('mousemove', (e )=> {this.onViewPortClick(e)});
            this.checkPinterActivityToClose = (e) => {this.onSomePointerActivity(e);}
        }

        hide() {
            if(!this.opened) return;

            for(let i =0; i < this.circleElements.length; i++) {
                this.circleElements[i].attr('display', 'none');
            }
            this.lineEl.attr('display', 'none');
            this.tooltipEl.style('display', 'none');

            this.opened = false;

            document.removeEventListener('mousemove', this.checkPinterActivityToClose);
            document.removeEventListener('mousedown', this.checkPinterActivityToClose);
        }
        createElements() {

            this.tooltipEl = createEl('div').addClass('chart-tooltip').style('left', '0').style('top', '0').style('display', 'none').appendTo(this.viewPortBackdropEl);
            this.tooltipDateEl = createEl('div').addClass('chart-tooltip-date').appendTo(this.tooltipEl);
            this.tooltipValuesContainerEl = createEl('div').addClass('chart-tooltip-values').appendTo(this.tooltipEl);
            this.tooltipValuesBlocksElMap = {};
            this.tooltipValuesElMap = {};
            for(let i = 0; i < this.viewPort.chartColumnsIds.length; i++) {
                const lId = this.viewPort.chartColumnsIds[i];
                const vb = createEl('div').addClass('chart-tooltip-value-block').style('color', this.viewPort.colorsMap[lId]).appendTo(this.tooltipValuesContainerEl);
                this.tooltipValuesBlocksElMap[lId] = vb;
                this.tooltipValuesElMap[lId] = createEl('div').addClass('chart-tooltip-value').appendTo(vb);
                createEl('div').addClass('chart-tooltip-name').innerText(this.viewPort.names[lId]).appendTo(vb); 
            }
            

            this.lineEl = createSVG('path').attr('display', 'none')
            .addClass('chart-tooltip-line').appendTo(this.hoverContainerEl);
            this.size$((s) => this.lineEl.attr('d', 'M0 0 L0 ' + (s.height)));
            
            for(let i = 0; i < this.viewPort.chartColumnsIds.length; i++) {
                const lId = this.viewPort.chartColumnsIds[i];
                const c = createSVG('circle')
                .attr('display', 'none')
                .attr('stroke', this.viewPort.colorsMap[lId])
                .attr('cx', '0')
                .attr('cy', '0')
                .attr('r', '3')
                .addClass('chart-tooltip-circle')
                .appendTo(this.hoverContainerEl);
                this.circleElementsMap[lId] = c;
                this.circleElements.push(c)
            }
        }
        onViewPortClick(e) {

            if(!this.viewPort.currentTransformations) return;

            if(!this.isCreatedElements) {
                this.createElements();
                this.isCreatedElements = true;
            }

            if(e.target !== this.viewPortBackdropEl.el) return;

            const visibleLines = this.viewPort.getEnabledLinesIds();
            if(visibleLines.length == 0) return;

            this.opened = true;

            const hm = this.viewPort.currentTransformations.hm;
            const vm = this.viewPort.currentTransformations.vm;

            const ihm = minverse(hm);
            const translatedPoint = pmul([e.offsetX, e.offsetY], ihm);
            const tx = translatedPoint[0];
            const pIdx = Math.round(tx / xStep) + 1;
            const xPoint = (pIdx - 1) * xStep;
            const xValue = this.viewPort.xColumn[pIdx];
            const xDate = new Date(xValue);

            const m = mmul(vm, hm);

            for(let i = 0; i < visibleLines.length; i++) {
                const lId = visibleLines[i];
                
                const circleEl = this.circleElementsMap[lId];
                const y = this.viewPort.columnsMap[lId][pIdx];
                const yPoint = this.viewPort.transformY(y);
                const translatedPoint = pmul([xPoint, yPoint] ,m);
                circleEl.attr('cx', translatedPoint[0]);
                circleEl.attr('cy', translatedPoint[1]);
                circleEl.attr('display', '');

                this.tooltipValuesElMap[lId].innerText('' + y);
                this.tooltipValuesBlocksElMap[lId].style('display', 'inline-block')
            }

            const disabledIds = this.viewPort.getDisabledLinesIds();
            for (let lId of disabledIds) {
                this.tooltipValuesBlocksElMap[lId].style('display', 'none');
            }
            const userLang = getNavigatorLanguage();
            const dateLabel = { weekday: 'short', month: 'short', day: 'numeric' };            
            this.tooltipDateEl.innerText(xDate.toLocaleDateString(userLang, dateLabel));
            this.tooltipEl.style('display', 'block');
            
            const baseX = pmulX(xPoint ,m);
            const tooltipRect = this.tooltipEl.el.getBoundingClientRect();
            const tooltipWidth = tooltipRect.width;
            let tooltipPosX = limit(baseX - 10, 0, this.size$.getValue().width - tooltipWidth);

            this.tooltipEl.style('left', tooltipPosX + 'px');
            this.tooltipEl.style('top', 0 + 'px');

            this.lineEl.attr('display', 'block');
            this.lineEl.attr('transform', 'translate(' + pmulX(xPoint ,m)  + ', 0)')

            document.addEventListener('mousemove', this.checkPinterActivityToClose);
            document.addEventListener('mousedown', this.checkPinterActivityToClose);
        }
        onSomePointerActivity(e) {
            if(!this.opened) return;
            const bdr = this.viewPortBackdropEl.el.getBoundingClientRect();
            if(!(e.clientX >= bdr.left && e.clientX <= bdr.right && e.clientY >= bdr.top && e.clientY <= bdr.bottom)) {
                this.hide();
            }
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
            const maxLabelInViewPort = Math.trunc(state.viewPortSize.width / this.getLabelWidth ()); // todo some coef for padding
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
            const c = optimizedSVGTransformations ? options.containerGEl : options.containerDivEl;
            this.el = new ElementBuilder(c);
            this.viewPort = options.viewPort;
            this.size$ = options.size$;
            this.elementsCache = {};
            this.currentRangeKey = null;
            this.currentBounds = null;
        }

        updateRange(bounds, vm) {
            this.transformY = this.viewPort.transformY;

            const [,,yMin,yMax] = bounds;
            const rKey = this.rangeToKey(yMin,yMax);
            if(this.currentRangeKey === rKey && mequals(vm, this.currentVM)) return;
            this.forceUpdate = false;

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
                
                if(optimizedSVGTransformations) {
                    const lEl = createSVG('path')
                    .style('vector-effect', 'non-scaling-stroke')
                    .attr('d',  'M0 0 L' + (this.size$.getValue().width) +' 0')
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
                } else {
                    const lEl = createEl('div')
                    .style('top',  y + 'px')
                    .addClass('chart-y-line')
                    .appendTo(this.el);
                    hGridLines.push(lEl);
                    cb(lEl);
        
                    const tEl = createEl('div')
                    .style('top',  y + 'px')
                    .innerText('' + lines[i].text)
                    .addClass('chart-y-line-text')
                    .appendTo(this.el);
                    hGridTexts.push(tEl);
                    cb(tEl);                    
                }
            }     
            return {hGridLines, hGridTexts};       
        }

        updateYGridLines(gridElements, lines, cb) {
            const {hGridLines, hGridTexts} = gridElements;
            const lc = lines.length;
            for(let i = 0; i < lc; i++) {
                let y = lines[i].y;
                
                if(optimizedSVGTransformations) {
                    hGridLines[i]
                    .attr('d',  'M0 0 L' + (this.size$.getValue().width) +' 0')
                    .attr('transform',  'matrix(1,0,0,1,0,' + y + ')');
                    cb(hGridLines[i]);
                    
                    hGridTexts[i]
                    //.textContent('' + lines[i].text)
                    .attr('transform',  'matrix(1,0,0,1,0,' + (y - 5) + ')');
                    cb(hGridTexts[i]);
                } else {
                    hGridLines[i]
                    .style('top',  y + 'px')
                    cb(hGridLines[i]);
                    
                    hGridTexts[i]
                    .style('top',  y + 'px')
                    cb(hGridTexts[i]);
                }
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
            this.width$ = options.width$;
            this.width$(() => this.positionByRange(), true);
            this.minRangeWidth = options.minRangeWidth || 5;
            this.el = new ElementBuilder(options.containerEl);
            this.onRangeChanged = () => {};
        }
        init() {
            this.leftCurtainEl = createEl('div').addClass('left-curtain').appendTo(this.el);
            this.rightCurtainEl = createEl('div').addClass('right-curtain').appendTo(this.el);
            this.leftGripperEl = createEl('div').addClass('left-gripper').appendTo(this.el);
            this.rightGripperEl = createEl('div').addClass('right-gripper').appendTo(this.el);
            this.sliderEl = createEl('div').addClass('slider').appendTo(this.el);
            this.sliderEl.on('pointerdown', (e) => this.onSliderMouseDown(e));
            this.leftGripperEl.on('pointerdown', (e) => this.onLeftGripperMouseDown(e));
            this.rightGripperEl.on('pointerdown', (e) => this.onRightGripperMouseDown(e));
            this.positionByRange();
        }
        raiseRangeChange() {
            this.range;
            const w = this.getWidth();
            const from = this.state.leftPos / w * 100;
            const to = this.state.rightPos / w * 100;
            this.onRangeChanged({from, to});
        }
        positionByRange() {
            const w = this.getWidth();
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
            const w = this.width$.getValue();
            if(w) return w;
            return this.width = this.el.el.getBoundingClientRect().width;
        }
        cloneState() {
            return {leftPos: this.state.leftPos, rightPos: this.state.rightPos, w: this.state.w};
        }        
        onSliderMouseDown(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            const w = this.getWidth();
            const startState = this.cloneState();
            const minWidth = this.minRangeWidth / 100 * w;
            const sliderWidth = Math.max(startState.rightPos - startState.leftPos, minWidth);
            dnd(e, (dndEvent) => {
                const leftPos = limit(startState.leftPos + dndEvent.delta.x, 0, w - sliderWidth);
                const rightPos = leftPos + sliderWidth;
                this.state = {...this.state, leftPos, rightPos};
                this.updateElementsByState();
                this.raiseRangeChange();
            });
        }
        onLeftGripperMouseDown(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            const w = this.getWidth();
            const startState = this.cloneState();
            const minWidth = this.minRangeWidth / 100 * w;
            dnd(e, (dndEvent) => {
                const leftPos = limit(startState.leftPos + dndEvent.delta.x, 0, startState.rightPos - minWidth);
                this.state = {...this.state, leftPos};
                this.updateElementsByState();
                this.raiseRangeChange();
            });
        }
        onRightGripperMouseDown(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            const w = this.getWidth();
            const startState = this.cloneState();
            const minWidth = this.minRangeWidth / 100 * w;
            dnd(e, (dndEvent) => {
                const rightPos = limit(startState.rightPos + dndEvent.delta.x, startState.leftPos + minWidth, w);
                this.state = {...this.state, rightPos};
                this.updateElementsByState();
                this.raiseRangeChange();
            });
        }        
    }


    const checkmark = '<svg class="checkmark"  version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="14px" height="14px" viewBox="0 0 45.701 45.7"	>'
    + '<g><g>'
    + '<path d="M20.687,38.332c-2.072,2.072-5.434,2.072-7.505,0L1.554,26.704c-2.072-2.071-2.072-5.433,0-7.504'
    + 'c2.071-2.072,5.433-2.072,7.505,0l6.928,6.927c0.523,0.522,1.372,0.522,1.896,0L36.642,7.368c2.071-2.072,5.433-2.072,7.505,0'
    + 'c0.995,0.995,1.554,2.345,1.554,3.752c0,1.407-0.559,2.757-1.554,3.752L20.687,38.332z"/>'
    + '</g></g></svg>';

    class ToggleGroup {
        
        constructor(options) {
            const {names, colors} = options;
            this.names = names;
            this.colors = colors;
            this.el = new ElementBuilder(options.containerEl);
            this.onToogle = () => {};
            this.init();
        }

        init() {
            this.el.addClass('chart-toggle-buttons');
            for (let k of Object.keys(this.names)) {
                let toggled = true;
                const n = this.names[k];
                const bEl = createEl('button')
                .addClass('toggle-button')
                .addClass('toggled')
                .appendTo(this.el);
                const cfEl = createEl('div').addClass('circle-figure').innerHTML(checkmark).appendTo(bEl);
                cfEl.style('border-color', this.colors[k]).style('background-color', this.colors[k]);
                
                const span = createEl('span').appendTo(bEl);                
                span.innerText(n);

                bEl.el.onclick = () => {
                    toggled = !toggled;
                    if(toggled) {
                        cfEl.style('background-color', this.colors[k]);
                        bEl.addClass('toggled');
                    } else {
                        cfEl.style('background-color', 'transparent');
                        bEl.removeClass('toggled');
                    }

                    this.onToogle(k);
                };
            }
        }
    }

    const createModeSwitcher = () => {
        const dayText = "Switch To Night Mode";
        const nightText = "Switch To Day Mode";
        const buttonEl = createEl('button').addClass('mode-switcher-button').innerText(dayText).appendTo(document.body);
        let night = false;
        const b = new ElementBuilder(document.body);
        buttonEl.on('click', () => {
            night = !night;
            if(night) {
                b.addClass('night');
                buttonEl.innerText(nightText);
            } else {
                b.removeClass('night');
                buttonEl.innerText(dayText);
            }
        })
    }

    g.createChart = createChart;
    g.createModeSwitcher = createModeSwitcher;

})(window);

